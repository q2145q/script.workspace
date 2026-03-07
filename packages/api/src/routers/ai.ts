import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@script/db";
import { getProvider, composePrompt, completeAI, extractTextFromTipTapJson, stripCodeFences, withProviderFallback, needsMapReduce, mapReduce } from "@script/ai";
import type { ProviderId, FallbackKeyResolver } from "@script/ai";
import {
  rewriteSchema,
  formatSchema,
  analyzeSceneSchema,
  analyzeCharactersSchema,
  analyzeStructureSchema,
  generateLoglineSchema,
  generateSynopsisSchema,
  describeCharacterSchema,
  describeLocationSchema,
  extractKnowledgeGraphSchema,
  generateSceneSynopsisSchema,
  generateAllSceneSynopsesSchema,
  sceneAnalysisSchema,
  characterAnalysisSchema,
  structureAnalysisSchema,
  knowledgeGraphSchema,
  dialoguePassSchema,
  checkConsistencySchema,
  consistencyResultSchema,
  generateBeatSheetSchema,
  beatSheetResultSchema,
  analyzePacingSchema,
  pacingResultSchema,
} from "@script/types";
import { aiRewriteResponseSchema } from "@script/ai";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { resolveApiKey } from "../global-key-resolver";
import { logApiUsage } from "../usage-logger";

function getSecret(): string {
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
async function resolveProjectAI(projectId: string, userId: string) {
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

/** Call AI with composed prompt, parse JSON response with Zod schema.
 *  Automatically falls back to another provider on retryable errors. */
async function callAIWithSchema<T>(
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
      const completion = await completeAI(pid, systemPrompt, userPrompt, cfg);
      const parsed = schema.parse(JSON.parse(stripCodeFences(completion.text)));
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
 * Otherwise, chunks the text and processes via map-reduce pipeline,
 * then parses the final result with the provided schema.
 */
async function callAIWithMapReduce<T>(
  providerId: ProviderId,
  taskName: string,
  fullText: string,
  config: { apiKey: string; model: string },
  schema: z.ZodType<T>,
  variables: Record<string, string> = {},
): Promise<{ result: T; tokensIn: number; tokensOut: number; durationMs: number }> {
  // Check if text fits in provider's context window
  if (!needsMapReduce(fullText, providerId, config.model)) {
    // Direct call — use existing callAIWithSchema
    return callAIWithSchema(providerId, taskName, fullText, config, schema, variables);
  }

  // Map-reduce path
  console.log(`[ai] Using map-reduce for ${taskName} (text too large for ${providerId}/${config.model})`);
  const mrResult = await mapReduce({
    providerId,
    config: { apiKey: config.apiKey, model: config.model },
    taskName,
    fullText,
    variables,
    concurrency: 3,
  });

  const parsed = schema.parse(JSON.parse(stripCodeFences(mrResult.text)));
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
async function completeAIWithMapReduce(
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

  console.log(`[ai] Using map-reduce for ${taskName} (text too large for ${providerId}/${config.model})`);
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

export const aiRouter = createTRPCRouter({
  /** Rewrite selected text using AI */
  rewrite: protectedProcedure
    .input(rewriteSchema)
    .mutation(async ({ ctx, input }) => {
      const document = await prisma.document.findFirst({
        where: {
          id: input.documentId,
          deletedAt: null,
          project: {
            OR: [
              { ownerId: ctx.user.id },
              {
                members: {
                  some: {
                    userId: ctx.user.id,
                    role: { in: ["OWNER", "EDITOR"] },
                  },
                },
              },
            ],
          },
        },
        include: {
          project: {
            select: {
              id: true,
              language: true,
              preferredProvider: true,
              preferredModel: true,
            },
          },
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found or you don't have editor access",
        });
      }

      let resolved;
      try {
        resolved = await resolveApiKey(
          getSecret(),
          document.project.preferredProvider,
          document.project.preferredModel,
        );
      } catch {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No AI provider configured. Contact administrator.",
        });
      }

      const provider = getProvider(resolved.provider as ProviderId);

      let result;
      try {
        result = await provider.rewrite(
          {
            selectedText: input.selectedText,
            instruction: input.instruction,
            contextBefore: input.contextBefore,
            contextAfter: input.contextAfter,
            nodeType: input.nodeType,
            blocks: input.blocks,
            previousResult: input.previousResult,
            language: document.project.language,
          },
          {
            apiKey: resolved.apiKey,
            model: resolved.model,
          }
        );
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[ai] Rewrite failed:", error);
        const message = error instanceof Error ? error.message : "Unknown AI error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `AI provider error: ${message}`,
        });
      }

      await logApiUsage({
        userId: ctx.user.id,
        projectId: document.project.id,
        provider: resolved.provider,
        model: resolved.model,
        feature: "rewrite",
        tokensIn: Math.ceil((input.selectedText.length + input.instruction.length) / 4),
        tokensOut: Math.ceil(JSON.stringify(result).length / 4),
        keySource: resolved.source,
      }).catch((err) => console.error("[ai] Usage log failed:", err));

      const suggestion = await prisma.suggestion.create({
        data: {
          documentId: input.documentId,
          createdById: ctx.user.id,
          instruction: input.instruction,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          operations: result.blocks as any,
          selectedText: input.selectedText,
          selectionFrom: input.selectionFrom,
          selectionTo: input.selectionTo,
          explanation: result.explanation,
        },
      });

      return {
        id: suggestion.id,
        blocks: result.blocks,
        explanation: result.explanation,
        selectionFrom: suggestion.selectionFrom,
        selectionTo: suggestion.selectionTo,
        nodeType: input.nodeType,
      };
    }),

  /** Format selected text into structured screenplay blocks */
  format: protectedProcedure
    .input(formatSchema)
    .mutation(async ({ ctx, input }) => {
      const document = await prisma.document.findFirst({
        where: {
          id: input.documentId,
          deletedAt: null,
          project: {
            OR: [
              { ownerId: ctx.user.id },
              { members: { some: { userId: ctx.user.id, role: { in: ["OWNER", "EDITOR"] } } } },
            ],
          },
        },
        include: {
          project: {
            select: {
              id: true,
              language: true,
              preferredProvider: true,
              preferredModel: true,
            },
          },
        },
      });

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found or no editor access" });
      }

      let resolved;
      try {
        resolved = await resolveApiKey(
          getSecret(),
          document.project.preferredProvider,
          document.project.preferredModel,
        );
      } catch {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No AI provider configured." });
      }

      const provider = getProvider(resolved.provider as ProviderId);

      try {
        const result = await provider.format(
          {
            selectedText: input.selectedText,
            contextBefore: input.contextBefore,
            contextAfter: input.contextAfter,
            language: document.project.language,
          },
          { apiKey: resolved.apiKey, model: resolved.model }
        );

        await logApiUsage({
          userId: ctx.user.id,
          projectId: document.project.id,
          provider: resolved.provider,
          model: resolved.model,
          feature: "format",
          tokensIn: Math.ceil(input.selectedText.length / 4),
          tokensOut: Math.ceil(JSON.stringify(result).length / 4),
          keySource: resolved.source,
        }).catch((err) => console.error("[ai] Usage log failed:", err));

        return {
          blocks: result.blocks,
          explanation: result.explanation,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[ai] Format failed:", error);
        const message = error instanceof Error ? error.message : "Unknown AI error";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI provider error: ${message}` });
      }
    }),

  // ============================================================
  // New AI features (Phase 3)
  // ============================================================

  /** Analyze a scene — breakdown of function, conflict, pacing, etc. */
  analyzeScene: protectedProcedure
    .input(analyzeSceneSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAI(input.projectId, ctx.user.id);
      const providerId = resolved.provider as ProviderId;

      try {
        const { result, tokensIn, tokensOut, durationMs } = await callAIWithSchema(
          providerId,
          "analysis",
          input.sceneText,
          { apiKey: resolved.apiKey, model: resolved.model },
          sceneAnalysisSchema,
          { SCENE_TEXT: input.sceneText, USER_LANGUAGE: project.language },
        );

        await logApiUsage({
          userId: ctx.user.id,
          projectId: project.id,
          provider: resolved.provider,
          model: resolved.model,
          feature: "analysis",
          tokensIn,
          tokensOut,
          durationMs,
          keySource: resolved.source,
        }).catch((err) => console.error("[ai] Usage log failed:", err));

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[ai] AI call failed:", error);
        const message = error instanceof Error ? error.message : "Unknown AI error";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI error: ${message}` });
      }
    }),

  /** Analyze characters — extract characters with traits, goals, relationships */
  analyzeCharacters: protectedProcedure
    .input(analyzeCharactersSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAI(input.projectId, ctx.user.id);
      const providerId = resolved.provider as ProviderId;

      try {
        const { result, tokensIn, tokensOut, durationMs } = await callAIWithMapReduce(
          providerId,
          "character-analysis",
          input.text,
          { apiKey: resolved.apiKey, model: resolved.model },
          characterAnalysisSchema,
          { SCENE_TEXT: input.text, USER_LANGUAGE: project.language },
        );

        await logApiUsage({
          userId: ctx.user.id,
          projectId: project.id,
          provider: resolved.provider,
          model: resolved.model,
          feature: "character-analysis",
          tokensIn,
          tokensOut,
          durationMs,
          keySource: resolved.source,
        }).catch((err) => console.error("[ai] Usage log failed:", err));

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[ai] AI call failed:", error);
        const message = error instanceof Error ? error.message : "Unknown AI error";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI error: ${message}` });
      }
    }),

  /** Analyze structure — three-act breakdown, turning points */
  analyzeStructure: protectedProcedure
    .input(analyzeStructureSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAI(input.projectId, ctx.user.id);
      const providerId = resolved.provider as ProviderId;

      try {
        const { result, tokensIn, tokensOut, durationMs } = await callAIWithMapReduce(
          providerId,
          "structure-analysis",
          input.sceneText,
          { apiKey: resolved.apiKey, model: resolved.model },
          structureAnalysisSchema,
          { SCENE_TEXT: input.sceneText, USER_LANGUAGE: project.language },
        );

        await logApiUsage({
          userId: ctx.user.id,
          projectId: project.id,
          provider: resolved.provider,
          model: resolved.model,
          feature: "structure-analysis",
          tokensIn,
          tokensOut,
          durationMs,
          keySource: resolved.source,
        }).catch((err) => console.error("[ai] Usage log failed:", err));

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[ai] AI call failed:", error);
        const message = error instanceof Error ? error.message : "Unknown AI error";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI error: ${message}` });
      }
    }),

  /** Generate logline from project context */
  generateLogline: protectedProcedure
    .input(generateLoglineSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAI(input.projectId, ctx.user.id);
      const providerId = resolved.provider as ProviderId;

      // Build project context: load documents + bible
      const [documents, bible] = await Promise.all([
        prisma.document.findMany({
          where: { projectId: input.projectId, deletedAt: null },
          select: { content: true },
          orderBy: { createdAt: "asc" },
          take: 5,
        }),
        prisma.projectBible.findUnique({
          where: { projectId: input.projectId },
          select: { content: true },
        }),
      ]);

      const docTexts = documents.map(d => extractTextFromTipTapJson(d.content)).filter(Boolean);
      const bibleText = bible ? extractTextFromTipTapJson(bible.content) : "";
      const projectContext = [bibleText, ...docTexts].filter(Boolean).join("\n\n---\n\n");

      if (!projectContext || projectContext.trim().length < 200) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Для генерации логлайна необходим текст сценария (минимум 200 символов). Напишите несколько сцен и попробуйте снова.",
        });
      }

      try {
        const completion = await completeAIWithMapReduce(
          providerId,
          "logline",
          projectContext,
          { apiKey: resolved.apiKey, model: resolved.model },
          {
            PROJECT_CONTEXT: projectContext,
            USER_REQUEST: input.userRequest || "",
            USER_LANGUAGE: project.language,
          },
        );

        await logApiUsage({
          userId: ctx.user.id,
          projectId: project.id,
          provider: resolved.provider,
          model: resolved.model,
          feature: "logline",
          tokensIn: completion.tokensIn,
          tokensOut: completion.tokensOut,
          durationMs: completion.durationMs,
          keySource: resolved.source,
        }).catch((err) => console.error("[ai] Usage log failed:", err));

        const loglineText = completion.text.trim();
        await prisma.project.update({
          where: { id: project.id },
          data: { logline: loglineText },
        });

        return { logline: loglineText };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[ai] AI call failed:", error);
        const message = error instanceof Error ? error.message : "Unknown AI error";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI error: ${message}` });
      }
    }),

  /** Generate synopsis from project context */
  generateSynopsis: protectedProcedure
    .input(generateSynopsisSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAI(input.projectId, ctx.user.id);
      const providerId = resolved.provider as ProviderId;

      // Load all documents + bible for full context
      const [documents, bible] = await Promise.all([
        prisma.document.findMany({
          where: { projectId: input.projectId, deletedAt: null },
          select: { content: true },
          orderBy: { createdAt: "asc" },
        }),
        prisma.projectBible.findUnique({
          where: { projectId: input.projectId },
          select: { content: true },
        }),
      ]);

      const docTexts = documents.map(d => extractTextFromTipTapJson(d.content)).filter(Boolean);
      const bibleText = bible ? extractTextFromTipTapJson(bible.content) : "";
      const projectContext = [bibleText, ...docTexts].filter(Boolean).join("\n\n---\n\n");

      if (!projectContext || projectContext.trim().length < 200) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Для генерации синопсиса необходим текст сценария (минимум 200 символов). Напишите несколько сцен и попробуйте снова.",
        });
      }

      try {
        const completion = await completeAIWithMapReduce(
          providerId,
          "synopsis",
          projectContext,
          { apiKey: resolved.apiKey, model: resolved.model },
          { USER_LANGUAGE: project.language },
        );

        await logApiUsage({
          userId: ctx.user.id,
          projectId: project.id,
          provider: resolved.provider,
          model: resolved.model,
          feature: "synopsis",
          tokensIn: completion.tokensIn,
          tokensOut: completion.tokensOut,
          durationMs: completion.durationMs,
          keySource: resolved.source,
        }).catch((err) => console.error("[ai] Usage log failed:", err));

        const synopsisText = completion.text.trim();
        await prisma.project.update({
          where: { id: project.id },
          data: { synopsis: synopsisText },
        });

        return { synopsis: synopsisText };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[ai] AI call failed:", error);
        const message = error instanceof Error ? error.message : "Unknown AI error";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI error: ${message}` });
      }
    }),

  /** Generate short character description */
  describeCharacter: protectedProcedure
    .input(describeCharacterSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAI(input.projectId, ctx.user.id);
      const providerId = resolved.provider as ProviderId;

      const systemPrompt = composePrompt(providerId, "describe-character", {
        USER_LANGUAGE: project.language,
      });

      const userPrompt = input.characterContext
        ? `Character: ${input.characterName}\n\nContext:\n${input.characterContext}`
        : `Character: ${input.characterName}`;

      try {
        const completion = await completeAI(
          providerId,
          systemPrompt,
          userPrompt,
          { apiKey: resolved.apiKey, model: resolved.model },
        );

        await logApiUsage({
          userId: ctx.user.id,
          projectId: project.id,
          provider: resolved.provider,
          model: resolved.model,
          feature: "describe-character",
          tokensIn: completion.usage.tokensIn,
          tokensOut: completion.usage.tokensOut,
          durationMs: completion.usage.durationMs,
          keySource: resolved.source,
        }).catch((err) => console.error("[ai] Usage log failed:", err));

        return { description: completion.text.trim() };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[ai] AI call failed:", error);
        const message = error instanceof Error ? error.message : "Unknown AI error";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI error: ${message}` });
      }
    }),

  /** Generate short location description */
  describeLocation: protectedProcedure
    .input(describeLocationSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAI(input.projectId, ctx.user.id);
      const providerId = resolved.provider as ProviderId;

      const systemPrompt = composePrompt(providerId, "describe-location", {
        USER_LANGUAGE: project.language,
      });

      const userPrompt = input.locationContext
        ? `Location: ${input.locationName}\n\nContext:\n${input.locationContext}`
        : `Location: ${input.locationName}`;

      try {
        const completion = await completeAI(
          providerId,
          systemPrompt,
          userPrompt,
          { apiKey: resolved.apiKey, model: resolved.model },
        );

        await logApiUsage({
          userId: ctx.user.id,
          projectId: project.id,
          provider: resolved.provider,
          model: resolved.model,
          feature: "describe-location",
          tokensIn: completion.usage.tokensIn,
          tokensOut: completion.usage.tokensOut,
          durationMs: completion.usage.durationMs,
          keySource: resolved.source,
        }).catch((err) => console.error("[ai] Usage log failed:", err));

        return { description: completion.text.trim() };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[ai] AI call failed:", error);
        const message = error instanceof Error ? error.message : "Unknown AI error";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI error: ${message}` });
      }
    }),

  /** Extract knowledge graph (entities, relationships, events) */
  extractKnowledgeGraph: protectedProcedure
    .input(extractKnowledgeGraphSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAI(input.projectId, ctx.user.id);
      const providerId = resolved.provider as ProviderId;

      try {
        const { result, tokensIn, tokensOut, durationMs } = await callAIWithMapReduce(
          providerId,
          "knowledge-graph",
          input.text,
          { apiKey: resolved.apiKey, model: resolved.model },
          knowledgeGraphSchema,
          { USER_LANGUAGE: project.language },
        );

        await logApiUsage({
          userId: ctx.user.id,
          projectId: project.id,
          provider: resolved.provider,
          model: resolved.model,
          feature: "knowledge-graph",
          tokensIn,
          tokensOut,
          durationMs,
          keySource: resolved.source,
        }).catch((err) => console.error("[ai] Usage log failed:", err));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await prisma.project.update({
          where: { id: project.id },
          data: { knowledgeGraph: result as any },
        });

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[ai] AI call failed:", error);
        const message = error instanceof Error ? error.message : "Unknown AI error";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI error: ${message}` });
      }
    }),

  /** Generate synopsis for a single scene */
  generateSceneSynopsis: protectedProcedure
    .input(generateSceneSynopsisSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAI(input.projectId, ctx.user.id);
      const providerId = resolved.provider as ProviderId;

      const systemPrompt = composePrompt(providerId, "scene-synopsis", {
        USER_LANGUAGE: project.language,
      });

      try {
        const completion = await completeAI(
          providerId,
          systemPrompt,
          `Scene heading: ${input.sceneHeading}\n\nScene text:\n${input.sceneText}`,
          { apiKey: resolved.apiKey, model: resolved.model },
        );

        await logApiUsage({
          userId: ctx.user.id,
          projectId: project.id,
          provider: resolved.provider,
          model: resolved.model,
          feature: "scene-synopsis",
          tokensIn: completion.usage.tokensIn,
          tokensOut: completion.usage.tokensOut,
          durationMs: completion.usage.durationMs,
          keySource: resolved.source,
        }).catch((err) => console.error("[ai] Usage log failed:", err));

        return { synopsis: completion.text.trim() };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[ai] AI call failed:", error);
        const message = error instanceof Error ? error.message : "Unknown AI error";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI error: ${message}` });
      }
    }),

  /** Generate synopses for all scenes in batch */
  generateAllSceneSynopses: protectedProcedure
    .input(generateAllSceneSynopsesSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAI(input.projectId, ctx.user.id);
      const providerId = resolved.provider as ProviderId;

      const results: Record<string, string> = {};
      const errors: Record<string, string> = {};

      for (const scene of input.scenes) {
        const systemPrompt = composePrompt(providerId, "scene-synopsis", {
          USER_LANGUAGE: project.language,
        });

        try {
          const completion = await completeAI(
            providerId,
            systemPrompt,
            `Scene heading: ${scene.heading}\n\nScene text:\n${scene.text}`,
            { apiKey: resolved.apiKey, model: resolved.model },
          );

          results[scene.heading] = completion.text.trim();

          await logApiUsage({
            userId: ctx.user.id,
            projectId: project.id,
            provider: resolved.provider,
            model: resolved.model,
            feature: "scene-synopsis",
            tokensIn: completion.usage.tokensIn,
            tokensOut: completion.usage.tokensOut,
            durationMs: completion.usage.durationMs,
            keySource: resolved.source,
          }).catch((err) => console.error("[ai] Usage log failed:", err));
        } catch (error) {
          console.error(`[ai] Scene synopsis failed for "${scene.heading}":`, error);
          results[scene.heading] = "";
          errors[scene.heading] = error instanceof Error ? error.message : "Unknown error";
        }
      }

      return { synopses: results, errors };
    }),

  // ============================================================
  // Phase 6 — New AI features
  // ============================================================

  /** Dialogue Pass — improve dialogue subtext, voice, rhythm */
  dialoguePass: protectedProcedure
    .input(dialoguePassSchema)
    .mutation(async ({ ctx, input }) => {
      const document = await prisma.document.findFirst({
        where: {
          id: input.documentId,
          deletedAt: null,
          project: {
            OR: [
              { ownerId: ctx.user.id },
              { members: { some: { userId: ctx.user.id, role: { in: ["OWNER", "EDITOR"] } } } },
            ],
          },
        },
        include: {
          project: { select: { id: true, language: true, preferredProvider: true, preferredModel: true } },
        },
      });

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found or no editor access" });
      }

      let resolved;
      try {
        resolved = await resolveApiKey(getSecret(), document.project.preferredProvider, document.project.preferredModel);
      } catch {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No AI provider configured." });
      }

      const providerId = resolved.provider as ProviderId;
      const blocksText = input.blocks.map(b => `[${b.type}] ${b.text}`).join("\n");
      const userPrompt = [
        `Selected dialogue blocks:\n${blocksText}`,
        input.contextBefore ? `\nContext before:\n${input.contextBefore}` : "",
        input.contextAfter ? `\nContext after:\n${input.contextAfter}` : "",
        input.characterContext ? `\nCharacter info:\n${input.characterContext}` : "",
      ].filter(Boolean).join("\n");

      try {
        const { result, tokensIn, tokensOut, durationMs } = await callAIWithSchema(
          providerId,
          "dialogue-pass",
          userPrompt,
          { apiKey: resolved.apiKey, model: resolved.model },
          aiRewriteResponseSchema,
          { USER_LANGUAGE: document.project.language },
        );

        await logApiUsage({
          userId: ctx.user.id,
          projectId: document.project.id,
          provider: resolved.provider,
          model: resolved.model,
          feature: "dialogue-pass",
          tokensIn,
          tokensOut,
          durationMs,
          keySource: resolved.source,
        }).catch((err) => console.error("[ai] Usage log failed:", err));

        // Create a suggestion for review
        const newText = result.blocks.map(b => b.text).join("\n");
        const suggestion = await prisma.suggestion.create({
          data: {
            documentId: input.documentId,
            createdById: ctx.user.id,
            instruction: "Dialogue Pass: improve subtext, voice, rhythm",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            operations: result.blocks as any,
            selectedText: input.selectedText,
            selectionFrom: input.selectionFrom,
            selectionTo: input.selectionTo,
            explanation: result.explanation,
          },
        });

        return {
          id: suggestion.id,
          blocks: result.blocks,
          explanation: result.explanation,
          selectionFrom: suggestion.selectionFrom,
          selectionTo: suggestion.selectionTo,
          nodeType: input.blocks[0]?.type ?? "dialogue",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[ai] AI call failed:", error);
        const message = error instanceof Error ? error.message : "Unknown AI error";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI error: ${message}` });
      }
    }),

  /** Consistency Check — find logic, timeline, character errors across the screenplay */
  checkConsistency: protectedProcedure
    .input(checkConsistencySchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAI(input.projectId, ctx.user.id);
      const providerId = resolved.provider as ProviderId;

      try {
        const { result, tokensIn, tokensOut, durationMs } = await callAIWithMapReduce(
          providerId,
          "consistency-check",
          input.text,
          { apiKey: resolved.apiKey, model: resolved.model },
          consistencyResultSchema,
          { USER_LANGUAGE: project.language },
        );

        await logApiUsage({
          userId: ctx.user.id,
          projectId: project.id,
          provider: resolved.provider,
          model: resolved.model,
          feature: "consistency-check",
          tokensIn,
          tokensOut,
          durationMs,
          keySource: resolved.source,
        }).catch((err) => console.error("[ai] Usage log failed:", err));

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[ai] AI call failed:", error);
        const message = error instanceof Error ? error.message : "Unknown AI error";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI error: ${message}` });
      }
    }),

  /** Beat Sheet — Save the Cat structure analysis */
  generateBeatSheet: protectedProcedure
    .input(generateBeatSheetSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAI(input.projectId, ctx.user.id);
      const providerId = resolved.provider as ProviderId;

      try {
        const { result, tokensIn, tokensOut, durationMs } = await callAIWithMapReduce(
          providerId,
          "beat-sheet",
          input.text,
          { apiKey: resolved.apiKey, model: resolved.model },
          beatSheetResultSchema,
          { USER_LANGUAGE: project.language },
        );

        await logApiUsage({
          userId: ctx.user.id,
          projectId: project.id,
          provider: resolved.provider,
          model: resolved.model,
          feature: "beat-sheet",
          tokensIn,
          tokensOut,
          durationMs,
          keySource: resolved.source,
        }).catch((err) => console.error("[ai] Usage log failed:", err));

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[ai] AI call failed:", error);
        const message = error instanceof Error ? error.message : "Unknown AI error";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI error: ${message}` });
      }
    }),

  /** Pacing Analysis — tempo, action/dialogue ratio per act, recommendations */
  analyzePacing: protectedProcedure
    .input(analyzePacingSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAI(input.projectId, ctx.user.id);
      const providerId = resolved.provider as ProviderId;

      try {
        const { result, tokensIn, tokensOut, durationMs } = await callAIWithMapReduce(
          providerId,
          "pacing-analysis",
          input.text,
          { apiKey: resolved.apiKey, model: resolved.model },
          pacingResultSchema,
          { USER_LANGUAGE: project.language },
        );

        await logApiUsage({
          userId: ctx.user.id,
          projectId: project.id,
          provider: resolved.provider,
          model: resolved.model,
          feature: "pacing-analysis",
          tokensIn,
          tokensOut,
          durationMs,
          keySource: resolved.source,
        }).catch((err) => console.error("[ai] Usage log failed:", err));

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[ai] AI call failed:", error);
        const message = error instanceof Error ? error.message : "Unknown AI error";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI error: ${message}` });
      }
    }),

  // ============================================================
  // AI Act Assignment — assign scenes to 3-act structure
  // ============================================================
  assignActs: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        documentId: z.string(),
        scenes: z.array(z.object({
          sceneIndex: z.number().int().min(0),
          heading: z.string(),
          synopsis: z.string().default(""),
        })).min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const resolved = await resolveApiKey(input.projectId, ctx.user.id);
      const providerId = resolved.provider as ProviderId;

      // Build scene list for the prompt
      const sceneList = input.scenes
        .map((s) => `Scene ${s.sceneIndex}: ${s.heading}${s.synopsis ? ` — ${s.synopsis}` : ""}`)
        .join("\n");

      const systemPrompt = composePrompt(providerId, "act-assignment", {
        SCENE_LIST: sceneList,
      });

      try {
        const completion = await completeAI(
          providerId,
          systemPrompt,
          `Assign these ${input.scenes.length} scenes to acts 1, 2, or 3.`,
          { apiKey: resolved.apiKey, model: resolved.model },
        );

        const parsed = z.array(z.object({
          sceneIndex: z.number(),
          act: z.number().int().min(1).max(3),
        })).parse(JSON.parse(stripCodeFences(completion.text)));

        // Update all scenes in a transaction
        await prisma.$transaction(
          parsed.map((item) =>
            prisma.sceneMetadata.update({
              where: {
                documentId_sceneIndex: {
                  documentId: input.documentId,
                  sceneIndex: item.sceneIndex,
                },
              },
              data: { act: item.act },
            })
          )
        );

        await logApiUsage({
          userId: ctx.user.id,
          provider: providerId,
          model: resolved.model,
          feature: "act-assignment",
          tokensIn: completion.usage.tokensIn,
          tokensOut: completion.usage.tokensOut,
          durationMs: completion.usage.durationMs,
          keySource: resolved.source,
        }).catch((err) => console.error("[ai] Usage log failed:", err));

        return { assignments: parsed };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[ai] Act assignment failed:", error);
        const message = error instanceof Error ? error.message : "Unknown AI error";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI error: ${message}` });
      }
    }),
});
