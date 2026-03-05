import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@script/db";
import { getProvider, composePrompt, completeAI, extractTextFromTipTapJson } from "@script/ai";
import type { ProviderId } from "@script/ai";
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
} from "@script/types";
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

/** Strip markdown code fences from AI response */
function stripCodeFences(text: string): string {
  let raw = text.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return raw;
}

/** Call AI with composed prompt, parse JSON response with Zod schema */
async function callAIWithSchema<T>(
  providerId: ProviderId,
  taskName: string,
  userPrompt: string,
  config: { apiKey: string; model: string },
  schema: z.ZodType<T>,
  variables: Record<string, string> = {},
): Promise<{ result: T; tokensIn: number; tokensOut: number; durationMs: number }> {
  const systemPrompt = composePrompt(providerId, taskName, variables);
  const completion = await completeAI(
    providerId,
    systemPrompt,
    userPrompt,
    config,
  );

  const parsed = schema.parse(JSON.parse(stripCodeFences(completion.text)));
  return {
    result: parsed,
    tokensIn: completion.usage.tokensIn,
    tokensOut: completion.usage.tokensOut,
    durationMs: completion.usage.durationMs,
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
      }).catch(() => {});

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
        }).catch(() => {});

        return {
          blocks: result.blocks,
          explanation: result.explanation,
        };
      } catch (error) {
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
        }).catch(() => {});

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
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
        const { result, tokensIn, tokensOut, durationMs } = await callAIWithSchema(
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
        }).catch(() => {});

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
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
        const { result, tokensIn, tokensOut, durationMs } = await callAIWithSchema(
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
        }).catch(() => {});

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
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
          where: { projectId: input.projectId },
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

      const systemPrompt = composePrompt(providerId, "logline", {
        PROJECT_CONTEXT: projectContext,
        USER_REQUEST: input.userRequest || "",
        USER_LANGUAGE: project.language,
      });

      try {
        const completion = await completeAI(
          providerId,
          systemPrompt,
          input.userRequest || "Generate a logline for this project.",
          { apiKey: resolved.apiKey, model: resolved.model },
        );

        await logApiUsage({
          userId: ctx.user.id,
          projectId: project.id,
          provider: resolved.provider,
          model: resolved.model,
          feature: "logline",
          tokensIn: completion.usage.tokensIn,
          tokensOut: completion.usage.tokensOut,
          durationMs: completion.usage.durationMs,
          keySource: resolved.source,
        }).catch(() => {});

        const loglineText = completion.text.trim();
        await prisma.project.update({
          where: { id: project.id },
          data: { logline: loglineText },
        });

        return { logline: loglineText };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
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
          where: { projectId: input.projectId },
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

      const systemPrompt = composePrompt(providerId, "synopsis", {
        USER_LANGUAGE: project.language,
      });

      try {
        const completion = await completeAI(
          providerId,
          systemPrompt,
          projectContext || "No screenplay content available.",
          { apiKey: resolved.apiKey, model: resolved.model },
        );

        await logApiUsage({
          userId: ctx.user.id,
          projectId: project.id,
          provider: resolved.provider,
          model: resolved.model,
          feature: "synopsis",
          tokensIn: completion.usage.tokensIn,
          tokensOut: completion.usage.tokensOut,
          durationMs: completion.usage.durationMs,
          keySource: resolved.source,
        }).catch(() => {});

        const synopsisText = completion.text.trim();
        await prisma.project.update({
          where: { id: project.id },
          data: { synopsis: synopsisText },
        });

        return { synopsis: synopsisText };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
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
        }).catch(() => {});

        return { description: completion.text.trim() };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
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
        }).catch(() => {});

        return { description: completion.text.trim() };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
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
        const { result, tokensIn, tokensOut, durationMs } = await callAIWithSchema(
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
        }).catch(() => {});

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await prisma.project.update({
          where: { id: project.id },
          data: { knowledgeGraph: result as any },
        });

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
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
        }).catch(() => {});

        return { synopsis: completion.text.trim() };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
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
          }).catch(() => {});
        } catch {
          // Skip failed scenes, continue with rest
          results[scene.heading] = "";
        }
      }

      return { synopses: results };
    }),
});
