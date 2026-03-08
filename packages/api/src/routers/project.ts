import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma, type Prisma } from "@script/db";
import { createProjectSchema, updateProjectSchema, titlePageSchema } from "@script/types";
import { logger } from "../logger";

export const projectRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().max(200).optional(),
          status: z.string().optional(),
          sortBy: z.enum(["updatedAt", "createdAt", "title"]).default("updatedAt"),
          sortDir: z.enum(["asc", "desc"]).default("desc"),
          cursor: z.string().optional(),
          limit: z.number().int().min(1).max(50).default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { search, status, sortBy = "updatedAt", sortDir = "desc", cursor, limit = 20 } = input ?? {};

      const accessFilter: Prisma.ProjectWhereInput = {
        deletedAt: null,
        OR: [
          { ownerId: ctx.user.id },
          { members: { some: { userId: ctx.user.id } } },
        ],
      };

      const searchFilter: Prisma.ProjectWhereInput = search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {};

      const statusFilter: Prisma.ProjectWhereInput = status
        ? { status: status as Prisma.EnumProjectStatusFilter }
        : {};

      const items = await prisma.project.findMany({
        where: {
          ...accessFilter,
          ...searchFilter,
          ...statusFilter,
        },
        orderBy: { [sortBy]: sortDir },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          _count: { select: { documents: { where: { deletedAt: null } } } },
        },
      });

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return { items, nextCursor };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.id,
          deletedAt: null,
          OR: [
            { ownerId: ctx.user.id },
            { members: { some: { userId: ctx.user.id } } },
          ],
        },
        include: {
          documents: {
            where: { deletedAt: null },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
          members: { include: { user: true } },
          episodes: {
            orderBy: { number: "asc" },
            include: { document: { select: { id: true, title: true } } },
          },
        },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return project;
    }),

  create: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      return prisma.project.create({
        data: {
          ...input,
          ownerId: ctx.user.id,
          documents: {
            create: {
              title: "Script",
              content: {
                type: "doc",
                content: [{ type: "paragraph" }],
              },
            },
          },
        },
        include: { documents: true },
      });
    }),

  update: protectedProcedure
    .input(updateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const project = await prisma.project.findFirst({
        where: { id, ownerId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const prismaData = { ...data } as Record<string, unknown>;
      if (data.knowledgeGraph !== undefined) {
        prismaData.knowledgeGraph = (data.knowledgeGraph ?? undefined) as unknown as Prisma.InputJsonValue;
      }
      return prisma.project.update({ where: { id }, data: prismaData });
    }),

  /** Soft delete (move to trash) */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.id, ownerId: ctx.user.id, deletedAt: null },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const result = await prisma.project.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      // Audit log
      await prisma.activityLog.create({
        data: {
          projectId: input.id,
          userId: ctx.user.id,
          action: "project_deleted",
          details: { title: project.title },
        },
      }).catch((err) => logger.error({ err }, "Audit log failed"));

      return result;
    }),

  /** Restore from trash */
  restore: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.id, ownerId: ctx.user.id, deletedAt: { not: null } },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return prisma.project.update({
        where: { id: input.id },
        data: { deletedAt: null },
      });
    }),

  /** Permanent delete */
  permanentDelete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.id, ownerId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      // Audit log before permanent delete (record will be cascade-deleted)
      logger.info({ projectId: input.id, userId: ctx.user.id, title: project.title }, "Project permanently deleted");
      return prisma.project.delete({ where: { id: input.id } });
    }),

  /** List trashed projects */
  listTrashed: protectedProcedure
    .query(async ({ ctx }) => {
      return prisma.project.findMany({
        where: {
          ownerId: ctx.user.id,
          deletedAt: { not: null },
        },
        orderBy: { deletedAt: "desc" },
        include: {
          _count: { select: { documents: true } },
        },
      });
    }),

  /** Bulk soft delete projects owned by the current user */
  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const result = await prisma.project.updateMany({
        where: {
          id: { in: input.ids },
          ownerId: ctx.user.id,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
      return { count: result.count };
    }),

  /** Bulk archive projects owned by the current user */
  bulkArchive: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const result = await prisma.project.updateMany({
        where: {
          id: { in: input.ids },
          ownerId: ctx.user.id,
        },
        data: { status: "ARCHIVED" },
      });
      return { count: result.count };
    }),

  /** Get title page data */
  getTitlePage: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          OR: [
            { ownerId: ctx.user.id },
            { members: { some: { userId: ctx.user.id } } },
          ],
        },
        select: {
          titlePage: true,
          title: true,
          owner: { select: { name: true, email: true } },
          members: {
            where: { role: { in: ["OWNER", "EDITOR"] } },
            include: { user: { select: { name: true } } },
          },
        },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      // Return saved title page or auto-generated defaults
      if (project.titlePage) {
        return project.titlePage as Record<string, unknown>;
      }

      // Auto-generate from project data
      const authors = [project.owner.name];
      for (const m of project.members) {
        if (m.user.name) authors.push(m.user.name);
      }
      return {
        title: project.title,
        subtitle: "",
        authors,
        contact: project.owner.email,
        company: "",
        draftDate: "",
        notes: "",
      };
    }),

  /** Save title page data */
  updateTitlePage: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      data: titlePageSchema,
    }))
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
      if (!project) throw new TRPCError({ code: "FORBIDDEN" });

      return prisma.project.update({
        where: { id: input.projectId },
        data: { titlePage: input.data as unknown as Prisma.InputJsonValue },
      });
    }),
});
