import { NextRequest } from "next/server";
import { auth } from "@script/api/auth";
import { prisma } from "@script/db";
import {
  buildChatContext,
  streamChat,
  extractTextFromTipTapJson,
  extractScreenplayStructure,
  composePrompt,
  isCircuitOpen,
  recordFailure,
  recordSuccess,
  getNextFallback,
  isRetryableError,
} from "@script/ai";
import type { ProviderId, StreamUsageResult } from "@script/ai";
import { resolveApiKey } from "@script/api/global-key-resolver";
import { logApiUsage } from "@script/api/usage-logger";

// Simple in-memory rate limiter for streaming endpoint
const chatRateStore = new Map<string, { count: number; resetAt: number }>();
function checkChatRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = chatRateStore.get(userId);
  if (!entry || entry.resetAt < now) {
    chatRateStore.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  entry.count++;
  return entry.count <= 10;
}

export async function POST(req: NextRequest) {
  // 1. Authenticate
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 1.5 Rate limit: 10 chat requests/min
  if (!checkChatRateLimit(session.user.id)) {
    return new Response("Rate limit exceeded", { status: 429 });
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

  // 7. Load full conversation history (per-user — each user has their own thread)
  // Load up to 100 messages for comprehensive context
  const history = await prisma.chatMessage.findMany({
    where: { projectId, userId: session.user.id },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  // 8. Load screenplay structure from project documents
  const projectDocuments = await prisma.document.findMany({
    where: { projectId, deletedAt: null },
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
  let activeProviderId = resolvedKey.provider as ProviderId;
  let activeConfig = { apiKey: resolvedKey.apiKey, model: resolvedKey.model };

  // If primary provider circuit is open, try fallback before streaming
  if (isCircuitOpen(activeProviderId)) {
    const fallbackId = getNextFallback(activeProviderId, new Set([activeProviderId]));
    if (fallbackId) {
      try {
        const fallbackKey = await resolveApiKey(secret, fallbackId);
        activeProviderId = fallbackKey.provider as ProviderId;
        activeConfig = { apiKey: fallbackKey.apiKey, model: fallbackKey.model };
      } catch {
        // No fallback available — proceed with primary and hope for the best
      }
    }
  }

  // AbortController to propagate client disconnection to AI providers
  const abortController = new AbortController();
  req.signal.addEventListener("abort", () => abortController.abort(), { once: true });

  const stream = new ReadableStream({
    async start(controller) {
      const callbacks = {
        onToken: (token: string) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ token })}\n\n`)
          );
        },
        onDone: async (fullText: string, usage?: StreamUsageResult) => {
          recordSuccess(activeProviderId);

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
              provider: activeProviderId,
              model: activeConfig.model,
              feature: "chat",
              tokensIn: usage.tokensIn,
              tokensOut: usage.tokensOut,
              durationMs: usage.durationMs,
              keySource: resolvedKey.source,
            }).catch((err) => console.error("[chat/stream] Usage log failed:", err));
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
          controller.close();
        },
        onError: (error: Error) => {
          // Abort is expected when client disconnects — close silently
          if (error.name === "AbortError" || abortController.signal.aborted) {
            controller.close();
            return;
          }
          // Record failure for circuit breaker
          if (isRetryableError(error)) {
            recordFailure(activeProviderId);
          }
          // Log full error server-side for debugging
          console.error("[chat/stream] AI error:", error.message, error.stack);
          // Send generic message to client — never expose internals
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Произошла ошибка при обработке запроса. Попробуйте ещё раз." })}\n\n`
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
        const systemPrompt = composePrompt(activeProviderId, "chat", {
          PROJECT_CONTEXT: chatContext.contextBlocks,
          USER_LANGUAGE: project.language || "en",
          SCREENPLAY_STRUCTURE: screenplayStructure,
        });

        const streamInput = {
          messages,
          systemPrompt,
          contextBlocks: "",
          signal: abortController.signal,
        };

        await streamChat(activeProviderId, streamInput, activeConfig, callbacks);
      } catch (err) {
        // Connection-level error — record failure, try fallback
        if (isRetryableError(err)) {
          recordFailure(activeProviderId);
          const tried = new Set([activeProviderId]);
          const fallbackId = getNextFallback(activeProviderId, tried);
          if (fallbackId) {
            try {
              const fallbackKey = await resolveApiKey(secret, fallbackId);
              const fbConfig = { apiKey: fallbackKey.apiKey, model: fallbackKey.model };
              const fbSystemPrompt = composePrompt(fallbackId as ProviderId, "chat", {
                PROJECT_CONTEXT: chatContext.contextBlocks,
                USER_LANGUAGE: project.language || "en",
                SCREENPLAY_STRUCTURE: screenplayStructure,
              });
              activeProviderId = fallbackId as ProviderId;
              activeConfig = fbConfig;
              await streamChat(
                fallbackId as ProviderId,
                { messages, systemPrompt: fbSystemPrompt, contextBlocks: "", signal: abortController.signal },
                fbConfig,
                callbacks,
              );
              return;
            } catch {
              // Fallback also failed
            }
          }
        }
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
