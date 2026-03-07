import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@script/db";
import {
  createEpisodeSchema,
  updateEpisodeSchema,
  deleteEpisodeSchema,
  listEpisodesSchema,
  reorderEpisodesSchema,
} from "@script/types";
import { assertProjectAccess, assertEditorAccess } from "../access";

export const episodeRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listEpisodesSchema)
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);
      return prisma.episode.findMany({
        where: { projectId: input.projectId, deletedAt: null },
        orderBy: { number: "asc" },
        include: {
          document: { select: { id: true, title: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(createEpisodeSchema)
    .mutation(async ({ ctx, input }) => {
      await assertEditorAccess(input.projectId, ctx.user.id);

      // Auto-number if not provided
      let number = input.number;
      if (!number) {
        const lastEp = await prisma.episode.findFirst({
          where: { projectId: input.projectId, deletedAt: null },
          orderBy: { number: "desc" },
          select: { number: true },
        });
        number = (lastEp?.number ?? 0) + 1;
      }

      // Create document + episode in transaction
      return prisma.$transaction(async (tx) => {
        const doc = await tx.document.create({
          data: {
            projectId: input.projectId,
            title: input.title,
            content: {
              type: "doc",
              content: [{ type: "paragraph" }],
            },
          },
        });

        return tx.episode.create({
          data: {
            projectId: input.projectId,
            title: input.title,
            number,
            documentId: doc.id,
          },
          include: {
            document: { select: { id: true, title: true } },
          },
        });
      });
    }),

  update: protectedProcedure
    .input(updateEpisodeSchema)
    .mutation(async ({ ctx, input }) => {
      const episode = await prisma.episode.findFirst({
        where: { id: input.id },
        select: { projectId: true },
      });
      if (!episode) throw new TRPCError({ code: "NOT_FOUND" });

      await assertEditorAccess(episode.projectId, ctx.user.id);

      const { id, ...data } = input;
      return prisma.episode.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(deleteEpisodeSchema)
    .mutation(async ({ ctx, input }) => {
      const episode = await prisma.episode.findFirst({
        where: { id: input.id },
        select: { projectId: true, documentId: true },
      });
      if (!episode) throw new TRPCError({ code: "NOT_FOUND" });

      await assertEditorAccess(episode.projectId, ctx.user.id);

      // Soft delete episode and its document
      const now = new Date();
      await prisma.$transaction([
        prisma.episode.update({ where: { id: input.id }, data: { deletedAt: now } }),
        prisma.document.update({ where: { id: episode.documentId }, data: { deletedAt: now } }),
      ]);

      return { success: true };
    }),

  reorder: protectedProcedure
    .input(reorderEpisodesSchema)
    .mutation(async ({ ctx, input }) => {
      await assertEditorAccess(input.projectId, ctx.user.id);

      const updates = input.episodeIds.map((id, index) =>
        prisma.episode.update({
          where: { id },
          data: { number: index + 1 },
        })
      );

      await prisma.$transaction(updates);
      return { success: true };
    }),
});
