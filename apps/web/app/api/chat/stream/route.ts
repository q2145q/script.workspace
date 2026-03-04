import { NextRequest } from "next/server";
import { auth } from "@script/api/auth";
import { prisma } from "@script/db";
import {
  decrypt,
  buildChatContext,
  streamChatOpenAI,
  streamChatAnthropic,
  extractTextFromTipTapJson,
} from "@script/ai";
import type { ProviderId } from "@script/ai";

export async function POST(req: NextRequest) {
  // 1. Authenticate
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Parse body
  const body = await req.json();
  const { projectId, content, editorContext } = body as {
    projectId: string;
    content: string;
    editorContext?: {
      currentSceneText?: string;
      adjacentScenesText?: string;
      documentSummary?: string;
    };
  };

  if (!projectId || !content) {
    return new Response("Missing projectId or content", { status: 400 });
  }

  // 3. Verify project access + get provider config
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      aiProviders: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      bible: true,
      contextPins: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  const providerConfig = project.aiProviders[0];
  if (!providerConfig) {
    return new Response("No AI provider configured", { status: 412 });
  }

  const secret = process.env.AI_ENCRYPTION_SECRET;
  if (!secret) {
    return new Response("AI encryption secret not configured", { status: 500 });
  }
  const apiKey = decrypt(providerConfig.apiKeyEnc, secret);

  // 4. Save user message to DB
  await prisma.chatMessage.create({
    data: {
      projectId,
      userId: session.user.id,
      role: "USER",
      content,
    },
  });

  // 5. Load conversation history (last 20 messages)
  const history = await prisma.chatMessage.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  // 6. Build context
  const bibleText = project.bible
    ? extractTextFromTipTapJson(project.bible.content)
    : undefined;

  const chatContext = buildChatContext({
    bibleText: bibleText || undefined,
    pins: project.contextPins.map((p) => ({
      content: p.content,
      label: p.label,
    })),
    currentSceneText: editorContext?.currentSceneText,
    adjacentScenesText: editorContext?.adjacentScenesText,
    documentSummary: editorContext?.documentSummary,
  });

  // 7. Stream response using SSE
  const encoder = new TextEncoder();
  const userId = session.user.id;
  const providerId = providerConfig.provider as ProviderId;
  const model = providerConfig.model;

  const stream = new ReadableStream({
    async start(controller) {
      const callbacks = {
        onToken: (token: string) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ token })}\n\n`)
          );
        },
        onDone: async (fullText: string) => {
          // Save assistant message to DB
          await prisma.chatMessage.create({
            data: {
              projectId,
              userId,
              role: "ASSISTANT",
              content: fullText,
            },
          });
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
          controller.close();
        },
        onError: (error: Error) => {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: error.message })}\n\n`
            )
          );
          controller.close();
        },
      };

      const messages = history.map((m) => ({
        role: m.role.toLowerCase() as "user" | "assistant",
        content: m.content,
      }));

      try {
        const streamInput = {
          messages,
          systemPrompt: chatContext.systemPrompt,
          contextBlocks: chatContext.contextBlocks,
        };
        const config = { apiKey, model };

        if (providerId === "openai") {
          await streamChatOpenAI(streamInput, config, callbacks);
        } else {
          await streamChatAnthropic(streamInput, config, callbacks);
        }
      } catch (err) {
        callbacks.onError(
          err instanceof Error ? err : new Error("Unknown error")
        );
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
