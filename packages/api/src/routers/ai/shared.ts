import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@script/db";
import {
  getProvider,
  composePrompt,
  completeAI,
  extractJson,
  stripCodeFences,
  withProviderFallback,
  needsMapReduce,
  mapReduce,
} from "@script/ai";
import type { ProviderId, FallbackKeyResolver } from "@script/ai";
import { resolveApiKey, resolveTaskModel } from "../../global-key-resolver";
import { logAiResponse } from "../../usage-logger";
import { logger } from "../../logger";

export { getProvider, composePrompt, completeAI, extractJson, stripCodeFences };
export { resolveTaskModel };
export type { ProviderId };

export function getSecret(): string {
  const secret = process.env.AI_ENCRYPTION_SECRET;
  if (!secret) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "AI encryption secret not configured",
    });
  }
  return secret;
}

/** Create a fallback key resolver that tries to find active global keys for other providers */
function createFallbackResolver(): FallbackKeyResolver {
  return async (providerId: ProviderId) => {
    try {
      return await resolveApiKey(getSecret(), providerId);
    } catch {
      return null;
    }
  };
}

/** Verify user has access to project and resolve AI provider */
export async function resolveProjectAI(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: {
      id: true,
      language: true,
      preferredProvider: true,
      preferredModel: true,
    },
  });

  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found or no access" });
  }

  let resolved;
  try {
    resolved = await resolveApiKey(
      getSecret(),
      project.preferredProvider,
      project.preferredModel,
    );
  } catch {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No AI provider configured." });
  }

  return { project, resolved };
}

/**
 * Verify user has access to project and resolve the optimal AI model for a specific task.
 * Uses benchmark-determined defaults instead of user's project preference.
 */
export async function resolveProjectAIForTask(projectId: string, userId: string, taskName: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: {
      id: true,
      language: true,
      preferredProvider: true,
      preferredModel: true,
    },
  });

  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found or no access" });
  }

  let resolved;
  try {
    resolved = await resolveTaskModel(getSecret(), taskName);
  } catch {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No AI provider configured." });
  }

  return { project, resolved };
}

/** Providers that support json_schema structured outputs */
const SCHEMA_CAPABLE_PROVIDERS = new Set<ProviderId>(["openai", "anthropic", "grok", "gemini"]);

/** Call AI with composed prompt, parse JSON response with Zod schema.
 *  Automatically falls back to another provider on retryable errors. */
export async function callAIWithSchema<T>(
  providerId: ProviderId,
  taskName: string,
  userPrompt: string,
  config: { apiKey: string; model: string },
  schema: z.ZodType<T>,
  variables: Record<string, string> = {},
): Promise<{ result: T; tokensIn: number; tokensOut: number; durationMs: number }> {
  return withProviderFallback(
    providerId,
    async (pid, cfg) => {
      const systemPrompt = composePrompt(pid, taskName, variables);
      const completion = await completeAI(pid, systemPrompt, userPrompt, cfg, {
        jsonMode: true,
        jsonSchema: SCHEMA_CAPABLE_PROVIDERS.has(pid) ? { schema, name: taskName } : undefined,
      });
      const parsed = schema.parse(JSON.parse(extractJson(completion.text)));
      return {
        result: parsed,
        tokensIn: completion.usage.tokensIn,
        tokensOut: completion.usage.tokensOut,
        durationMs: completion.usage.durationMs,
      };
    },
    config,
    createFallbackResolver(),
  );
}

/**
 * Call AI with map-reduce support. If text fits in context, calls directly.
 * Otherwise, chunks the text and processes via map-reduce pipeline.
 */
export async function callAIWithMapReduce<T>(
  providerId: ProviderId,
  taskName: string,
  fullText: string,
  config: { apiKey: string; model: string },
  schema: z.ZodType<T>,
  variables: Record<string, string> = {},
): Promise<{ result: T; tokensIn: number; tokensOut: number; durationMs: number }> {
  if (!needsMapReduce(fullText, providerId, config.model)) {
    return callAIWithSchema(providerId, taskName, fullText, config, schema, variables);
  }

  logger.info({ taskName, providerId, model: config.model }, "Using map-reduce (text too large)");
  const mrResult = await mapReduce({
    providerId,
    config: { apiKey: config.apiKey, model: config.model },
    taskName,
    fullText,
    variables,
    concurrency: 3,
  });

  const parsed = schema.parse(JSON.parse(extractJson(mrResult.text)));
  return {
    result: parsed,
    tokensIn: mrResult.usage.tokensIn,
    tokensOut: mrResult.usage.tokensOut,
    durationMs: mrResult.usage.durationMs,
  };
}

/**
 * Non-schema variant: map-reduce that returns raw text (for synopsis, logline).
 */
export async function completeAIWithMapReduce(
  providerId: ProviderId,
  taskName: string,
  fullText: string,
  config: { apiKey: string; model: string },
  variables: Record<string, string> = {},
): Promise<{ text: string; tokensIn: number; tokensOut: number; durationMs: number }> {
  if (!needsMapReduce(fullText, providerId, config.model)) {
    const systemPrompt = composePrompt(providerId, taskName, variables);
    const result = await completeAI(providerId, systemPrompt, fullText, config);
    return {
      text: result.text,
      tokensIn: result.usage.tokensIn,
      tokensOut: result.usage.tokensOut,
      durationMs: result.usage.durationMs,
    };
  }

  logger.info({ taskName, providerId, model: config.model }, "Using map-reduce (text too large)");
  const mrResult = await mapReduce({
    providerId,
    config: { apiKey: config.apiKey, model: config.model },
    taskName,
    fullText,
    variables,
    concurrency: 3,
  });

  return {
    text: mrResult.text,
    tokensIn: mrResult.usage.tokensIn,
    tokensOut: mrResult.usage.tokensOut,
    durationMs: mrResult.usage.durationMs,
  };
}

/** Wrap AI errors in TRPCError and log to AiResponseLog */
export function handleAIError(
  error: unknown,
  label: string,
  context?: { userId: string; projectId?: string; provider: string; model: string; feature: string },
): never {
  if (error instanceof TRPCError) throw error;
  logger.error({ err: error, label }, "AI request failed");
  const message = error instanceof Error ? error.message : "Unknown AI error";

  if (context) {
    logAiResponse({
      userId: context.userId,
      projectId: context.projectId,
      provider: context.provider,
      model: context.model,
      feature: context.feature,
      status: "error",
      errorMessage: message,
    });
  }

  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI error: ${message}` });
}

export { logAiResponse };
