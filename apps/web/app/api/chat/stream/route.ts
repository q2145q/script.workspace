import { NextRequest } from "next/server";
import { auth } from "@script/api/auth";
import { prisma } from "@script/db";
import {
  buildChatContext,
  streamChat,
  extractTextFromTipTapJson,
  extractScreenplayStructure,
  composePrompt,
} from "@script/ai";
import type { ProviderId, StreamUsageResult } from "@script/ai";
import { resolveApiKey } from "@script/api/global-key-resolver";
import { logApiUsage } from "@script/api/usage-logger";

export async function POST(req: NextRequest) {
  // 1. Authenticate
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Beta gate
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { betaApproved: true },
  });
  if (!user?.betaApproved) {
    return new Response("Доступ ограничен. Вы в очереди на подключение к бета-версии.", { status: 403 });
  }

  // 3. Parse body
  const body = await req.json();
  const { projectId, content, editorContext } = body as {
    projectId: string;
    content: string;
    editorContext?: {
      currentSceneText?: string;
      adjacentScenesText?: string;
      documentSummary?: string;
    };
    overrideProvider?: string;
    overrideModel?: string;
  };

  if (!projectId || !content) {
    return new Response("Missing projectId or content", { status: 400 });
  }

  // 4. Verify project access
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      bible: true,
      contextPins: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  // 5. Resolve global API key with project's preferred provider/model
  const secret = process.env.AI_ENCRYPTION_SECRET;
  if (!secret) {
    return new Response("AI encryption secret not configured", { status: 500 });
  }

  let resolvedKey;
  try {
    resolvedKey = await resolveApiKey(
      secret,
      body.overrideProvider || project.preferredProvider,
      body.overrideModel || project.preferredModel,
    );
  } catch {
    return new Response("No AI provider configured", { status: 412 });
  }

  // 6. Save user message to DB
  await prisma.chatMessage.create({
    data: {
      projectId,
      userId: session.user.id,
      role: "USER",
      content,
    },
  });

  // 7. Load conversation history (per-user — each user has their own thread)
  const history = await prisma.chatMessage.findMany({
    where: { projectId, userId: session.user.id },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  // 8. Load screenplay structure from project documents
  const projectDocuments = await prisma.document.findMany({
    where: { projectId },
    select: { title: true, content: true },
    orderBy: { createdAt: "asc" },
  });
  const screenplayStructure = extractScreenplayStructure(projectDocuments);

  // 9. Build context
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

  // 9. Stream response using SSE
  const encoder = new TextEncoder();
  const userId = session.user.id;
  const providerId = resolvedKey.provider as ProviderId;

  const stream = new ReadableStream({
    async start(controller) {
      const callbacks = {
        onToken: (token: string) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ token })}\n\n`)
          );
        },
        onDone: async (fullText: string, usage?: StreamUsageResult) => {
          // Save assistant message to DB
          await prisma.chatMessage.create({
            data: {
              projectId,
              userId,
              role: "ASSISTANT",
              content: fullText,
            },
          });

          // Log usage
          if (usage) {
            await logApiUsage({
              userId,
              projectId,
              provider: resolvedKey.provider,
              model: resolvedKey.model,
              feature: "chat",
              tokensIn: usage.tokensIn,
              tokensOut: usage.tokensOut,
              durationMs: usage.durationMs,
              keySource: resolvedKey.source,
            }).catch(() => {}); // Non-critical, don't fail the stream
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
          controller.close();
        },
        onError: (error: Error) => {
          // Sanitize — never expose API keys or internal details to client
          const safeMessage = error.message.replace(/(?:sk-|Api-Key\s|Bearer\s)\S+/gi, "[REDACTED]");
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: safeMessage })}\n\n`
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
        const systemPrompt = composePrompt(providerId, "chat", {
          PROJECT_CONTEXT: chatContext.contextBlocks,
          USER_LANGUAGE: project.language || "en",
          SCREENPLAY_STRUCTURE: screenplayStructure,
        });

        const streamInput = {
          messages,
          systemPrompt,
          contextBlocks: "",
        };
        const config = { apiKey: resolvedKey.apiKey, model: resolvedKey.model };

        await streamChat(providerId, streamInput, config, callbacks);
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
