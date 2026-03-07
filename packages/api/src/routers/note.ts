import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma, type Prisma } from "@script/db";
import { tipTapContentSchema } from "@script/types";
import { assertProjectAccess } from "../access";

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

  /** Create a new note (optionally with plain text content) */
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      title: z.string().max(200).optional(),
      /** Plain text content — auto-converted to TipTap JSON */
      plainText: z.string().max(50000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);

      // Convert plain text to TipTap JSON if provided
      let content: Prisma.InputJsonValue | undefined;
      if (input.plainText) {
        const paragraphs = input.plainText.split("\n").map((line) => {
          if (!line.trim()) return { type: "paragraph" as const };
          return {
            type: "paragraph" as const,
            content: [{ type: "text" as const, text: line }],
          };
        });
        content = {
          type: "doc",
          content: paragraphs.length > 0 ? paragraphs : [{ type: "paragraph" }],
        };
      }

      return prisma.projectNote.create({
        data: {
          projectId: input.projectId,
          title: input.title || "Untitled Note",
          ...(content ? { content } : {}),
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
      content: tipTapContentSchema,
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
        data: { content: input.content as unknown as Prisma.InputJsonValue },
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
