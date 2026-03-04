import { TRPCError } from "@trpc/server";
import { prisma } from "@script/db";
import { suggestionActionSchema, listSuggestionsSchema } from "@script/types";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const suggestionRouter = createTRPCRouter({
  /** List suggestions for a document */
  list: protectedProcedure
    .input(listSuggestionsSchema)
    .query(async ({ ctx, input }) => {
      // Verify access
      const document = await prisma.document.findFirst({
        where: {
          id: input.documentId,
          project: {
            OR: [
              { ownerId: ctx.user.id },
              { members: { some: { userId: ctx.user.id } } },
            ],
          },
        },
      });

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      }

      return prisma.suggestion.findMany({
        where: {
          documentId: input.documentId,
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          createdBy: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  /** Get pending suggestions for a document */
  pending: protectedProcedure
    .input(listSuggestionsSchema.pick({ documentId: true }))
    .query(async ({ ctx, input }) => {
      const document = await prisma.document.findFirst({
        where: {
          id: input.documentId,
          project: {
            OR: [
              { ownerId: ctx.user.id },
              { members: { some: { userId: ctx.user.id } } },
            ],
          },
        },
      });

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      }

      return prisma.suggestion.findMany({
        where: { documentId: input.documentId, status: "PENDING" },
        include: {
          createdBy: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  /** Apply a suggestion (mark as APPLIED) */
  accept: protectedProcedure
    .input(suggestionActionSchema)
    .mutation(async ({ ctx, input }) => {
      const suggestion = await prisma.suggestion.findFirst({
        where: { id: input.id },
        include: {
          document: {
            include: {
              project: true,
            },
          },
        },
      });

      if (!suggestion) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Suggestion not found" });
      }

      // Check editor access
      const hasAccess = suggestion.document.project.ownerId === ctx.user.id ||
        await prisma.projectMember.findFirst({
          where: {
            projectId: suggestion.document.projectId,
            userId: ctx.user.id,
            role: { in: ["OWNER", "EDITOR"] },
          },
        });

      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only editors can apply suggestions" });
      }

      return prisma.suggestion.update({
        where: { id: input.id },
        data: { status: "APPLIED" },
      });
    }),

  /** Reject a suggestion (mark as REJECTED) */
  reject: protectedProcedure
    .input(suggestionActionSchema)
    .mutation(async ({ ctx, input }) => {
      const suggestion = await prisma.suggestion.findFirst({
        where: { id: input.id },
        include: {
          document: {
            include: {
              project: true,
            },
          },
        },
      });

      if (!suggestion) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Suggestion not found" });
      }

      const hasAccess = suggestion.document.project.ownerId === ctx.user.id ||
        await prisma.projectMember.findFirst({
          where: {
            projectId: suggestion.document.projectId,
            userId: ctx.user.id,
            role: { in: ["OWNER", "EDITOR"] },
          },
        });

      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only editors can reject suggestions" });
      }

      return prisma.suggestion.update({
        where: { id: input.id },
        data: { status: "REJECTED" },
      });
    }),

  /** Undo an applied suggestion (mark as UNDONE) */
  undo: protectedProcedure
    .input(suggestionActionSchema)
    .mutation(async ({ ctx, input }) => {
      const suggestion = await prisma.suggestion.findFirst({
        where: { id: input.id, status: "APPLIED" },
        include: {
          document: { include: { project: true } },
        },
      });

      if (!suggestion) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Applied suggestion not found" });
      }

      const hasAccess = suggestion.document.project.ownerId === ctx.user.id ||
        await prisma.projectMember.findFirst({
          where: {
            projectId: suggestion.document.projectId,
            userId: ctx.user.id,
            role: { in: ["OWNER", "EDITOR"] },
          },
        });

      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only editors can undo suggestions" });
      }

      return prisma.suggestion.update({
        where: { id: input.id },
        data: { status: "UNDONE" },
      });
    }),
});
