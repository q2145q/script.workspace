import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma, type Prisma } from "@script/db";
import { tipTapContentSchema } from "@script/types";

/** Common where clause for project access check */
function docProjectAccess(userId: string) {
  return {
    project: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
  };
}

/** Editor-level access (owner or editor role) */
function docEditorAccess(userId: string) {
  return {
    project: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId, role: { in: ["OWNER" as const, "EDITOR" as const] } } } },
      ],
    },
  };
}

export const documentRouter = createTRPCRouter({
  /** List documents for a project */
  list: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      includeDeleted: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      return prisma.document.findMany({
        where: {
          projectId: input.projectId,
          ...(!input.includeDeleted ? { deletedAt: null } : {}),
          ...docProjectAccess(ctx.user.id),
        },
        select: {
          id: true,
          title: true,
          sortOrder: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const doc = await prisma.document.findFirst({
        where: {
          id: input.id,
          deletedAt: null,
          ...docProjectAccess(ctx.user.id),
        },
      });
      if (!doc) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return doc;
    }),

  /** Create a new document in a project */
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      title: z.string().max(255).default("Untitled"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check access
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
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Use transaction to prevent sortOrder race condition
      return prisma.$transaction(async (tx) => {
        const last = await tx.document.findFirst({
          where: { projectId: input.projectId, deletedAt: null },
          orderBy: { sortOrder: "desc" },
          select: { sortOrder: true },
        });

        return tx.document.create({
          data: {
            projectId: input.projectId,
            title: input.title,
            content: { type: "doc", content: [{ type: "paragraph" }] },
            sortOrder: (last?.sortOrder ?? 0) + 1,
          },
        });
      });
    }),

  /** Rename a document */
  rename: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).max(255),
    }))
    .mutation(async ({ ctx, input }) => {
      const doc = await prisma.document.findFirst({
        where: { id: input.id, deletedAt: null, ...docEditorAccess(ctx.user.id) },
      });
      if (!doc) throw new TRPCError({ code: "FORBIDDEN" });

      return prisma.document.update({
        where: { id: input.id },
        data: { title: input.title },
      });
    }),

  /** Soft delete a document */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await prisma.document.findFirst({
        where: { id: input.id, deletedAt: null, ...docEditorAccess(ctx.user.id) },
      });
      if (!doc) throw new TRPCError({ code: "FORBIDDEN" });

      return prisma.document.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),

  /** Restore a soft-deleted document */
  restore: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await prisma.document.findFirst({
        where: {
          id: input.id,
          deletedAt: { not: null },
          ...docEditorAccess(ctx.user.id),
        },
      });
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });

      return prisma.document.update({
        where: { id: input.id },
        data: { deletedAt: null },
      });
    }),

  /** Duplicate a document */
  duplicate: protectedProcedure
    .input(z.object({
      id: z.string(),
      newTitle: z.string().max(255).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const doc = await prisma.document.findFirst({
        where: { id: input.id, deletedAt: null, ...docEditorAccess(ctx.user.id) },
      });
      if (!doc) throw new TRPCError({ code: "FORBIDDEN" });

      // Use transaction to prevent sortOrder race condition
      return prisma.$transaction(async (tx) => {
        const last = await tx.document.findFirst({
          where: { projectId: doc.projectId, deletedAt: null },
          orderBy: { sortOrder: "desc" },
          select: { sortOrder: true },
        });

        return tx.document.create({
          data: {
            projectId: doc.projectId,
            title: input.newTitle || `${doc.title} (копия)`,
            content: doc.content as Prisma.InputJsonValue,
            metadata: doc.metadata as Prisma.InputJsonValue ?? undefined,
            sortOrder: (last?.sortOrder ?? 0) + 1,
          },
        });
      });
    }),

  save: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        content: tipTapContentSchema,
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const doc = await prisma.document.findFirst({
        where: { id: input.id, deletedAt: null, ...docEditorAccess(ctx.user.id) },
      });
      if (!doc) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return prisma.document.update({
        where: { id: input.id },
        data: {
          content: input.content as unknown as Prisma.InputJsonValue,
          ...(input.title && { title: input.title }),
        },
      });
    }),

  /** Save document metadata (e.g. scene synopses) */
  saveMetadata: protectedProcedure
    .input(z.object({
      id: z.string(),
      metadata: z.record(z.string(), z.unknown()),
    }))
    .mutation(async ({ ctx, input }) => {
      const doc = await prisma.document.findFirst({
        where: { id: input.id, deletedAt: null, ...docEditorAccess(ctx.user.id) },
      });
      if (!doc) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return prisma.document.update({
        where: { id: input.id },
        data: { metadata: input.metadata as unknown as Prisma.InputJsonValue },
      });
    }),
});
