import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { prisma } from "@script/db";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const providerRouter = createTRPCRouter({
  /** List available providers (with active global key) and their enabled models */
  availableModels: protectedProcedure.query(async () => {
    const activeKeys = await prisma.globalApiKey.findMany({
      where: { isActive: true },
      select: { provider: true },
    });
    const activeProviders = activeKeys.map((k) => k.provider);

    if (activeProviders.length === 0) {
      return [];
    }

    const models = await prisma.globalModelConfig.findMany({
      where: {
        provider: { in: activeProviders },
        isEnabled: true,
      },
      orderBy: [{ provider: "asc" }, { sortOrder: "asc" }],
      select: {
        provider: true,
        modelId: true,
        modelLabel: true,
      },
    });

    const grouped: Record<string, Array<{ id: string; label: string }>> = {};
    for (const m of models) {
      if (!grouped[m.provider]) grouped[m.provider] = [];
      grouped[m.provider].push({ id: m.modelId, label: m.modelLabel });
    }

    return Object.entries(grouped).map(([provider, providerModels]) => ({
      provider,
      models: providerModels,
    }));
  }),

  /** Update preferred provider/model for a project */
  updateModel: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        preferredProvider: z.string().nullish(),
        preferredModel: z.string().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          OR: [
            { ownerId: ctx.user.id },
            { members: { some: { userId: ctx.user.id, role: { in: ["OWNER", "EDITOR"] } } } },
          ],
        },
      });

      if (!project) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No access to this project" });
      }

      return prisma.project.update({
        where: { id: input.projectId },
        data: {
          preferredProvider: input.preferredProvider ?? null,
          preferredModel: input.preferredModel ?? null,
        },
        select: { id: true, preferredProvider: true, preferredModel: true },
      });
    }),
});
