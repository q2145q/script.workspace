import { TRPCError } from "@trpc/server";
import { prisma } from "@script/db";
import { getProvider, aiRewriteResponseSchema } from "@script/ai";
import {
  rewriteSchema,
  formatSchema,
  dialoguePassSchema,
  fixGrammarSchema,
  grammarResultSchema,
} from "@script/types";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { resolveApiKey } from "../../global-key-resolver";
import { logApiUsage } from "../../usage-logger";
import { logger } from "../../logger";
import {
  getSecret,
  callAIWithSchema,
  handleAIError,
  resolveTaskModel,
  type ProviderId,
} from "./shared";

export const rewriteRouter = createTRPCRouter({
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
        resolved = await resolveTaskModel(getSecret(), "rewrite");
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
        handleAIError(error, "Rewrite", {
          userId: ctx.user.id, projectId: document.project.id,
          provider: resolved.provider, model: resolved.model, feature: "rewrite",
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
      }).catch((err) => logger.error({ err }, "Usage log failed"));

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
        resolved = await resolveTaskModel(getSecret(), "format");
      } catch {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No AI provider configured for formatting." });
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
        }).catch((err) => logger.error({ err }, "Usage log failed"));

        return {
          blocks: result.blocks,
          explanation: result.explanation,
        };
      } catch (error) {
        handleAIError(error, "Format", {
          userId: ctx.user.id, projectId: document.project.id,
          provider: resolved.provider, model: resolved.model, feature: "format",
        });
      }
    }),

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
        resolved = await resolveTaskModel(getSecret(), "dialogue-pass");
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
        }).catch((err) => logger.error({ err }, "Usage log failed"));

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
        handleAIError(error, "Dialogue pass", {
          userId: ctx.user.id, projectId: document.project.id,
          provider: resolved.provider, model: resolved.model, feature: "dialogue-pass",
        });
      }
    }),

  /** Fix grammar, spelling, and punctuation in selected text */
  fixGrammar: protectedProcedure
    .input(fixGrammarSchema)
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
          project: { select: { id: true, language: true } },
        },
      });

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found or no editor access" });
      }

      let resolved;
      try {
        resolved = await resolveTaskModel(getSecret(), "fix-grammar");
      } catch {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No AI provider configured." });
      }

      const userPrompt = [
        `Selected text:\n${input.selectedText}`,
        input.contextBefore ? `\nContext before:\n${input.contextBefore}` : "",
        input.contextAfter ? `\nContext after:\n${input.contextAfter}` : "",
      ].filter(Boolean).join("\n");

      try {
        const { result, tokensIn, tokensOut, durationMs } = await callAIWithSchema(
          resolved.provider as ProviderId,
          "fix-grammar",
          userPrompt,
          { apiKey: resolved.apiKey, model: resolved.model },
          grammarResultSchema,
          { USER_LANGUAGE: document.project.language },
        );

        await logApiUsage({
          userId: ctx.user.id,
          projectId: document.project.id,
          provider: resolved.provider,
          model: resolved.model,
          feature: "fix-grammar",
          tokensIn,
          tokensOut,
          durationMs,
          keySource: resolved.source,
        }).catch((err) => logger.error({ err }, "Usage log failed"));

        return {
          corrections: result.corrections,
          selectionFrom: input.selectionFrom,
          selectionTo: input.selectionTo,
        };
      } catch (error) {
        handleAIError(error, "Fix Grammar", {
          userId: ctx.user.id, projectId: document.project.id,
          provider: resolved.provider, model: resolved.model, feature: "fix-grammar",
        });
      }
    }),
});
