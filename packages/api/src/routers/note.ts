import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@script/db";

/** Verify user has access to the project */
async function assertProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
  });
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found or no access" });
  }
  return project;
}

export const noteRouter = createTRPCRouter({
  /** List all notes for a project */
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);

      return prisma.projectNote.findMany({
        where: { projectId: input.projectId },
        select: { id: true, title: true, updatedAt: true, createdAt: true },
        orderBy: { updatedAt: "desc" },
      });
    }),

  /** Get a single note */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const note = await prisma.projectNote.findUnique({
        where: { id: input.id },
        include: { project: { select: { ownerId: true, members: { select: { userId: true } } } } },
      });
      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      // Check access
      const hasAccess = note.project.ownerId === ctx.user.id ||
        note.project.members.some((m) => m.userId === ctx.user.id);
      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return note;
    }),

  /** Create a new note */
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      title: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);

      return prisma.projectNote.create({
        data: {
          projectId: input.projectId,
          title: input.title || "Untitled Note",
        },
      });
    }),

  /** Update note title */
  updateTitle: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().max(200),
    }))
    .mutation(async ({ ctx, input }) => {
      const note = await prisma.projectNote.findUnique({
        where: { id: input.id },
        include: { project: { select: { ownerId: true, members: { select: { userId: true } } } } },
      });
      if (!note) throw new TRPCError({ code: "NOT_FOUND" });

      const hasAccess = note.project.ownerId === ctx.user.id ||
        note.project.members.some((m) => m.userId === ctx.user.id);
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });

      return prisma.projectNote.update({
        where: { id: input.id },
        data: { title: input.title },
      });
    }),

  /** Update note content */
  updateContent: protectedProcedure
    .input(z.object({
      id: z.string(),
      content: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      const note = await prisma.projectNote.findUnique({
        where: { id: input.id },
        include: { project: { select: { ownerId: true, members: { select: { userId: true } } } } },
      });
      if (!note) throw new TRPCError({ code: "NOT_FOUND" });

      const hasAccess = note.project.ownerId === ctx.user.id ||
        note.project.members.some((m) => m.userId === ctx.user.id);
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });

      return prisma.projectNote.update({
        where: { id: input.id },
        data: { content: input.content },
      });
    }),

  /** Delete a note */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const note = await prisma.projectNote.findUnique({
        where: { id: input.id },
        include: { project: { select: { ownerId: true, members: { select: { userId: true } } } } },
      });
      if (!note) throw new TRPCError({ code: "NOT_FOUND" });

      const hasAccess = note.project.ownerId === ctx.user.id ||
        note.project.members.some((m) => m.userId === ctx.user.id);
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });

      await prisma.projectNote.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
