import {
  analyzeSceneSchema,
  analyzeCharactersSchema,
  analyzeStructureSchema,
  sceneAnalysisSchema,
  characterAnalysisSchema,
  structureAnalysisSchema,
  checkConsistencySchema,
  consistencyResultSchema,
  generateBeatSheetSchema,
  beatSheetResultSchema,
  analyzePacingSchema,
  pacingResultSchema,
} from "@script/types";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { logApiUsage } from "../../usage-logger";
import { logger } from "../../logger";
import {
  resolveProjectAIForTask,
  callAIWithSchema,
  callAIWithMapReduce,
  handleAIError,
  type ProviderId,
} from "./shared";

export const analysisRouter = createTRPCRouter({
  /** Analyze a scene — breakdown of function, conflict, pacing, etc. */
  analyzeScene: protectedProcedure
    .input(analyzeSceneSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAIForTask(input.projectId, ctx.user.id, "analysis");
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
        }).catch((err) => logger.error({ err }, "Usage log failed"));

        return result;
      } catch (error) {
        handleAIError(error, "Scene analysis", {
          userId: ctx.user.id, projectId: project.id,
          provider: resolved.provider, model: resolved.model, feature: "analysis",
        });
      }
    }),

  /** Analyze characters — extract characters with traits, goals, relationships */
  analyzeCharacters: protectedProcedure
    .input(analyzeCharactersSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAIForTask(input.projectId, ctx.user.id, "character-analysis");
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
        }).catch((err) => logger.error({ err }, "Usage log failed"));

        return result;
      } catch (error) {
        handleAIError(error, "Character analysis", {
          userId: ctx.user.id, projectId: project.id,
          provider: resolved.provider, model: resolved.model, feature: "character-analysis",
        });
      }
    }),

  /** Analyze structure — three-act breakdown, turning points */
  analyzeStructure: protectedProcedure
    .input(analyzeStructureSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAIForTask(input.projectId, ctx.user.id, "structure-analysis");
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
        }).catch((err) => logger.error({ err }, "Usage log failed"));

        return result;
      } catch (error) {
        handleAIError(error, "Structure analysis", {
          userId: ctx.user.id, projectId: project.id,
          provider: resolved.provider, model: resolved.model, feature: "structure-analysis",
        });
      }
    }),

  /** Consistency Check — find logic, timeline, character errors */
  checkConsistency: protectedProcedure
    .input(checkConsistencySchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAIForTask(input.projectId, ctx.user.id, "consistency-check");
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
        }).catch((err) => logger.error({ err }, "Usage log failed"));

        return result;
      } catch (error) {
        handleAIError(error, "Consistency check", {
          userId: ctx.user.id, projectId: project.id,
          provider: resolved.provider, model: resolved.model, feature: "consistency-check",
        });
      }
    }),

  /** Beat Sheet — Save the Cat structure analysis */
  generateBeatSheet: protectedProcedure
    .input(generateBeatSheetSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAIForTask(input.projectId, ctx.user.id, "beat-sheet");
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
        }).catch((err) => logger.error({ err }, "Usage log failed"));

        return result;
      } catch (error) {
        handleAIError(error, "Beat sheet", {
          userId: ctx.user.id, projectId: project.id,
          provider: resolved.provider, model: resolved.model, feature: "beat-sheet",
        });
      }
    }),

  /** Pacing Analysis — tempo, action/dialogue ratio per act */
  analyzePacing: protectedProcedure
    .input(analyzePacingSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, resolved } = await resolveProjectAIForTask(input.projectId, ctx.user.id, "pacing-analysis");
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
        }).catch((err) => logger.error({ err }, "Usage log failed"));

        return result;
      } catch (error) {
        handleAIError(error, "Pacing analysis", {
          userId: ctx.user.id, projectId: project.id,
          provider: resolved.provider, model: resolved.model, feature: "pacing-analysis",
        });
      }
    }),
});
