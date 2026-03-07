import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@script/db";
import {
  createDraftSchema,
  listDraftsSchema,
  getDraftSchema,
  restoreDraftSchema,
} from "@script/types";

async function assertDocumentAccess(documentId: string, userId: string) {
  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      project: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
    },
  });
  if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
  return doc;
}

async function assertDocumentEditAccess(documentId: string, userId: string) {
  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      project: {
        OR: [
          { ownerId: userId },
          {
            members: {
              some: { userId, role: { in: ["OWNER", "EDITOR"] } },
            },
          },
        ],
      },
    },
  });
  if (!doc) throw new TRPCError({ code: "FORBIDDEN" });
  return doc;
}

export const draftRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listDraftsSchema)
    .query(async ({ ctx, input }) => {
      await assertDocumentAccess(input.documentId, ctx.user.id);
      return prisma.draft.findMany({
        where: { documentId: input.documentId },
        orderBy: { number: "desc" },
        select: {
          id: true,
          name: true,
          number: true,
          createdAt: true,
        },
      });
    }),

  create: protectedProcedure
    .input(createDraftSchema)
    .mutation(async ({ ctx, input }) => {
      const doc = await assertDocumentEditAccess(input.documentId, ctx.user.id);

      const lastDraft = await prisma.draft.findFirst({
        where: { documentId: input.documentId },
        orderBy: { number: "desc" },
        select: { number: true },
      });

      const nextNumber = (lastDraft?.number ?? 0) + 1;

      return prisma.draft.create({
        data: {
          documentId: input.documentId,
          name: input.name ?? `Draft ${nextNumber}`,
          content: doc.content as object,
          number: nextNumber,
        },
      });
    }),

  getById: protectedProcedure
    .input(getDraftSchema)
    .query(async ({ ctx, input }) => {
      const draft = await prisma.draft.findFirst({
        where: { id: input.id },
        include: {
          document: {
            select: {
              project: {
                select: {
                  ownerId: true,
                  members: { select: { userId: true } },
                },
              },
            },
          },
        },
      });
      if (!draft) throw new TRPCError({ code: "NOT_FOUND" });

      const project = draft.document.project;
      const hasAccess =
        project.ownerId === ctx.user.id ||
        project.members.some((m) => m.userId === ctx.user.id);
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });

      return {
        id: draft.id,
        name: draft.name,
        number: draft.number,
        content: draft.content,
        createdAt: draft.createdAt,
      };
    }),

  restore: protectedProcedure
    .input(restoreDraftSchema)
    .mutation(async ({ ctx, input }) => {
      const draft = await prisma.draft.findFirst({
        where: { id: input.id },
        include: {
          document: {
            select: {
              id: true,
              content: true,
              deletedAt: true,
              project: {
                select: {
                  ownerId: true,
                  members: {
                    select: { userId: true, role: true },
                  },
                },
              },
            },
          },
        },
      });
      if (!draft) throw new TRPCError({ code: "NOT_FOUND" });

      if (draft.document.deletedAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot restore draft to a deleted document" });
      }

      const project = draft.document.project;
      const isOwner = project.ownerId === ctx.user.id;
      const isEditor = project.members.some(
        (m) => m.userId === ctx.user.id && ["OWNER", "EDITOR"].includes(m.role)
      );
      if (!isOwner && !isEditor) throw new TRPCError({ code: "FORBIDDEN" });

      // Create safety snapshot of current content before restoring
      const lastDraft = await prisma.draft.findFirst({
        where: { documentId: draft.document.id },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      const nextNumber = (lastDraft?.number ?? 0) + 1;

      await prisma.$transaction([
        prisma.draft.create({
          data: {
            documentId: draft.document.id,
            name: `Before restore (auto)`,
            content: draft.document.content as object,
            number: nextNumber,
          },
        }),
        prisma.document.update({
          where: { id: draft.document.id },
          data: { content: draft.content as object },
        }),
      ]);

      return { success: true };
    }),
});
