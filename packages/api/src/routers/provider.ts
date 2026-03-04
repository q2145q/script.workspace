import { TRPCError } from "@trpc/server";
import { prisma } from "@script/db";
import { encrypt, decrypt } from "@script/ai";
import {
  configureProviderSchema,
  listProvidersSchema,
  removeProviderSchema,
  updateProviderModelSchema,
} from "@script/types";
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

/** Mask an API key for display: show first 4 and last 4 chars */
function maskKey(encryptedKey: string): string {
  try {
    const decrypted = decrypt(encryptedKey, getSecret());
    if (decrypted.length <= 8) return "****";
    return `${decrypted.slice(0, 4)}...${decrypted.slice(-4)}`;
  } catch {
    return "****";
  }
}

async function assertProjectOwnerOrEditor(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId, role: { in: ["OWNER", "EDITOR"] } } } },
      ],
    },
  });

  if (!project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only project owners and editors can manage AI providers",
    });
  }

  return project;
}

export const providerRouter = createTRPCRouter({
  /** Configure (upsert) an AI provider for a project */
  configure: protectedProcedure
    .input(configureProviderSchema)
    .mutation(async ({ ctx, input }) => {
      await assertProjectOwnerOrEditor(input.projectId, ctx.user.id);

      const encryptedKey = encrypt(input.apiKey, getSecret());

      const provider = await prisma.aIProvider.upsert({
        where: {
          projectId_provider: {
            projectId: input.projectId,
            provider: input.provider,
          },
        },
        update: {
          apiKeyEnc: encryptedKey,
          model: input.model ?? (input.provider === "openai" ? "gpt-4.1" : "claude-sonnet-4-6"),
          isActive: true,
        },
        create: {
          projectId: input.projectId,
          provider: input.provider,
          apiKeyEnc: encryptedKey,
          model: input.model ?? (input.provider === "openai" ? "gpt-4.1" : "claude-sonnet-4-6"),
        },
      });

      return {
        id: provider.id,
        provider: provider.provider,
        model: provider.model,
        maskedKey: maskKey(provider.apiKeyEnc),
        isActive: provider.isActive,
      };
    }),

  /** List AI providers for a project (with masked keys) */
  list: protectedProcedure
    .input(listProvidersSchema)
    .query(async ({ ctx, input }) => {
      await assertProjectOwnerOrEditor(input.projectId, ctx.user.id);

      const providers = await prisma.aIProvider.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "asc" },
      });

      return providers.map((p) => ({
        id: p.id,
        provider: p.provider,
        model: p.model,
        maskedKey: maskKey(p.apiKeyEnc),
        isActive: p.isActive,
      }));
    }),

  /** Update the model for an existing provider (without changing the API key) */
  updateModel: protectedProcedure
    .input(updateProviderModelSchema)
    .mutation(async ({ ctx, input }) => {
      await assertProjectOwnerOrEditor(input.projectId, ctx.user.id);

      const provider = await prisma.aIProvider.update({
        where: {
          projectId_provider: {
            projectId: input.projectId,
            provider: input.provider,
          },
        },
        data: { model: input.model },
      });

      return {
        id: provider.id,
        provider: provider.provider,
        model: provider.model,
      };
    }),

  /** Remove an AI provider configuration */
  remove: protectedProcedure
    .input(removeProviderSchema)
    .mutation(async ({ ctx, input }) => {
      await assertProjectOwnerOrEditor(input.projectId, ctx.user.id);

      await prisma.aIProvider.delete({
        where: {
          projectId_provider: {
            projectId: input.projectId,
            provider: input.provider,
          },
        },
      });

      return { success: true };
    }),
});
