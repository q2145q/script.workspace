import { TRPCError } from "@trpc/server";
import { prisma } from "@script/db";
import { getProvider, decrypt } from "@script/ai";
import type { ProviderId } from "@script/ai";
import { rewriteSchema, formatSchema } from "@script/types";
import { createTRPCRouter, protectedProcedure } from "../trpc";

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

export const aiRouter = createTRPCRouter({
  /** Rewrite selected text using AI */
  rewrite: protectedProcedure
    .input(rewriteSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Get document and verify access
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
            include: {
              aiProviders: {
                where: { isActive: true },
                orderBy: { createdAt: "asc" },
                take: 1,
              },
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

      // 2. Get active AI provider
      const providerConfig = document.project.aiProviders[0];
      if (!providerConfig) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No AI provider configured. Go to project settings to add your API key.",
        });
      }

      // 3. Decrypt API key
      const apiKey = decrypt(providerConfig.apiKeyEnc, getSecret());

      // 4. Call AI provider
      const provider = getProvider(providerConfig.provider as ProviderId);

      let result;
      try {
        result = await provider.rewrite(
          {
            selectedText: input.selectedText,
            instruction: input.instruction,
            contextBefore: input.contextBefore,
            contextAfter: input.contextAfter,
            nodeType: input.nodeType,
            previousResult: input.previousResult,
            language: document.project.language,
          },
          {
            apiKey,
            model: providerConfig.model,
          }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown AI error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `AI provider error: ${message}`,
        });
      }

      // 5. Save suggestion to DB
      const suggestion = await prisma.suggestion.create({
        data: {
          documentId: input.documentId,
          createdById: ctx.user.id,
          instruction: input.instruction,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          operations: result.operations as any,
          selectedText: input.selectedText,
          selectionFrom: input.selectionFrom,
          selectionTo: input.selectionTo,
          explanation: result.explanation,
        },
      });

      return {
        id: suggestion.id,
        operations: result.operations,
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
            include: {
              aiProviders: { where: { isActive: true }, orderBy: { createdAt: "asc" }, take: 1 },
            },
          },
        },
      });

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found or no editor access" });
      }

      const providerConfig = document.project.aiProviders[0];
      if (!providerConfig) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No AI provider configured." });
      }

      const apiKey = decrypt(providerConfig.apiKeyEnc, getSecret());
      const provider = getProvider(providerConfig.provider as ProviderId);

      try {
        const result = await provider.format(
          {
            selectedText: input.selectedText,
            contextBefore: input.contextBefore,
            contextAfter: input.contextAfter,
            language: document.project.language,
          },
          { apiKey, model: providerConfig.model }
        );

        return {
          blocks: result.blocks,
          explanation: result.explanation,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown AI error";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI provider error: ${message}` });
      }
    }),
});
