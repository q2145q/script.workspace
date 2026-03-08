import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@script/db";
import { extractTextFromTipTapJson } from "@script/ai";
import {
  generateLoglineSchema,
  generateSynopsisSchema,
  describeCharacterSchema,
  describeLocationSchema,
  extractKnowledgeGraphSchema,
  generateSceneSynopsisSchema,
  generateAllSceneSynopsesSchema,
  knowledgeGraphSchema,
} from "@script/types";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { logApiUsage } from "../../usage-logger";
import { logger } from "../../logger";
import {
  resolveProjectAI,
  callAIWithMapReduce,
  completeAIWithMapReduce,
  composePrompt,
  completeAI,
  extractJson,
  handleAIError,
  type ProviderId,
} from "./shared";
import { resolveApiKey } from "../../global-key-resolver";
import { getSecret } from "./shared";

export const generationRouter = createTRPCRouter({
  /** Generate logline from project context */
  generateLogline: protectedProcedure
    .input(generateLoglineSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAI(input.projectId, ctx.user.id);
      const providerId = resolved.provider as ProviderId;

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
        }).catch((err) => logger.error({ err }, "Usage log failed"));

        const loglineText = completion.text.trim();
        await prisma.project.update({
          where: { id: project.id },
          data: { logline: loglineText },
        });

        return { logline: loglineText };
      } catch (error) {
        handleAIError(error, "Logline generation", {
          userId: ctx.user.id, projectId: project.id,
          provider: resolved.provider, model: resolved.model, feature: "logline",
        });
      }
    }),

  /** Generate synopsis from project context */
  generateSynopsis: protectedProcedure
    .input(generateSynopsisSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAI(input.projectId, ctx.user.id);
      const providerId = resolved.provider as ProviderId;

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
        }).catch((err) => logger.error({ err }, "Usage log failed"));

        const synopsisText = completion.text.trim();
        await prisma.project.update({
          where: { id: project.id },
          data: { synopsis: synopsisText },
        });

        return { synopsis: synopsisText };
      } catch (error) {
        handleAIError(error, "Synopsis generation", {
          userId: ctx.user.id, projectId: project.id,
          provider: resolved.provider, model: resolved.model, feature: "synopsis",
        });
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
        }).catch((err) => logger.error({ err }, "Usage log failed"));

        return { description: completion.text.trim() };
      } catch (error) {
        handleAIError(error, "Character description", {
          userId: ctx.user.id, projectId: project.id,
          provider: resolved.provider, model: resolved.model, feature: "describe-character",
        });
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
        }).catch((err) => logger.error({ err }, "Usage log failed"));

        return { description: completion.text.trim() };
      } catch (error) {
        handleAIError(error, "Location description", {
          userId: ctx.user.id, projectId: project.id,
          provider: resolved.provider, model: resolved.model, feature: "describe-location",
        });
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
        }).catch((err) => logger.error({ err }, "Usage log failed"));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await prisma.project.update({
          where: { id: project.id },
          data: { knowledgeGraph: result as any },
        });

        return result;
      } catch (error) {
        handleAIError(error, "Knowledge graph extraction", {
          userId: ctx.user.id, projectId: project.id,
          provider: resolved.provider, model: resolved.model, feature: "knowledge-graph",
        });
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
        }).catch((err) => logger.error({ err }, "Usage log failed"));

        return { synopsis: completion.text.trim() };
      } catch (error) {
        handleAIError(error, "Scene synopsis", {
          userId: ctx.user.id, projectId: project.id,
          provider: resolved.provider, model: resolved.model, feature: "scene-synopsis",
        });
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
          }).catch((err) => logger.error({ err }, "Usage log failed"));
        } catch (error) {
          logger.error({ err: error, scene: scene.heading }, "Scene synopsis failed");
          results[scene.heading] = "";
          errors[scene.heading] = error instanceof Error ? error.message : "Unknown error";
        }
      }

      return { synopses: results, errors };
    }),

  /** AI Act Assignment — assign scenes to 3-act structure */
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
      const { resolved } = await resolveProjectAI(input.projectId, ctx.user.id);
      const providerId = resolved.provider as ProviderId;

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
        })).parse(JSON.parse(extractJson(completion.text)));

        const scenesByIndex = new Map(input.scenes.map((s) => [s.sceneIndex, s]));
        await prisma.$transaction(
          parsed.map((item) =>
            prisma.sceneMetadata.upsert({
              where: {
                documentId_sceneIndex: {
                  documentId: input.documentId,
                  sceneIndex: item.sceneIndex,
                },
              },
              update: { act: item.act },
              create: {
                documentId: input.documentId,
                sceneIndex: item.sceneIndex,
                heading: scenesByIndex.get(item.sceneIndex)?.heading ?? "",
                act: item.act,
              },
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
        }).catch((err) => logger.error({ err }, "Usage log failed"));

        return { assignments: parsed };
      } catch (error) {
        handleAIError(error, "Act assignment", {
          userId: ctx.user.id, projectId: input.projectId,
          provider: resolved.provider, model: resolved.model, feature: "act-assignment",
        });
      }
    }),
});
