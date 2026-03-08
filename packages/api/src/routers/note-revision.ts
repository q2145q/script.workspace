import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma, type Prisma } from "@script/db";

/** Check note access */
async function assertNoteAccess(noteId: string, userId: string) {
  const note = await prisma.projectNote.findFirst({
    where: {
      id: noteId,
      project: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
    },
    select: { id: true, projectId: true },
  });
  if (!note) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Note not found or no access" });
  }
  return note;
}

/** Simple FNV-1a hash for content comparison */
function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

/** Count words in a TipTap JSON document */
function countWords(content: unknown): number {
  let text = "";
  function walk(node: unknown) {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n.type === "text" && typeof n.text === "string") {
      text += n.text + " ";
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) walk(child);
    }
  }
  walk(content);
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const noteRevisionRouter = createTRPCRouter({
  /** List revisions for a note (newest first) */
  list: protectedProcedure
    .input(
      z.object({
        noteId: z.string(),
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await assertNoteAccess(input.noteId, ctx.user.id);

      const revisions = await prisma.noteRevision.findMany({
        where: { noteId: input.noteId },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor
          ? { cursor: { id: input.cursor }, skip: 1 }
          : {}),
        select: {
          id: true,
          number: true,
          summary: true,
          wordCount: true,
          createdBy: true,
          createdAt: true,
        },
      });

      let nextCursor: string | undefined;
      if (revisions.length > input.limit) {
        const next = revisions.pop();
        nextCursor = next?.id;
      }

      return { items: revisions, nextCursor };
    }),

  /** Create a manual snapshot */
  create: protectedProcedure
    .input(
      z.object({
        noteId: z.string(),
        summary: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertNoteAccess(input.noteId, ctx.user.id);

      const note = await prisma.projectNote.findUnique({
        where: { id: input.noteId },
        select: { content: true },
      });
      if (!note) throw new TRPCError({ code: "NOT_FOUND" });

      const last = await prisma.noteRevision.findFirst({
        where: { noteId: input.noteId },
        orderBy: { number: "desc" },
        select: { number: true },
      });

      const number = (last?.number ?? 0) + 1;
      const contentStr = JSON.stringify(note.content);

      return prisma.noteRevision.create({
        data: {
          noteId: input.noteId,
          content: note.content as Prisma.InputJsonValue,
          number,
          createdBy: ctx.user.id,
          summary: input.summary,
          wordCount: countWords(note.content),
          contentHash: fnv1a(contentStr),
        },
      });
    }),

  /** Get full revision content */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rev = await prisma.noteRevision.findUnique({
        where: { id: input.id },
        include: {
          note: {
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
      if (!rev) throw new TRPCError({ code: "NOT_FOUND" });

      const hasAccess =
        rev.note.project.ownerId === ctx.user.id ||
        rev.note.project.members.some((m) => m.userId === ctx.user.id);
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });

      return rev;
    }),

  /** Restore a revision — overwrites note content */
  restore: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rev = await prisma.noteRevision.findUnique({
        where: { id: input.id },
        include: {
          note: {
            select: {
              id: true,
              content: true,
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
      if (!rev) throw new TRPCError({ code: "NOT_FOUND" });

      const hasAccess =
        rev.note.project.ownerId === ctx.user.id ||
        rev.note.project.members.some((m) => m.userId === ctx.user.id);
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });

      // Create backup revision of current content first
      const last = await prisma.noteRevision.findFirst({
        where: { noteId: rev.note.id },
        orderBy: { number: "desc" },
        select: { number: true },
      });

      const backupNumber = (last?.number ?? 0) + 1;

      await prisma.noteRevision.create({
        data: {
          noteId: rev.note.id,
          content: rev.note.content as Prisma.InputJsonValue,
          number: backupNumber,
          createdBy: ctx.user.id,
          summary: `Backup before restoring revision #${rev.number}`,
          wordCount: countWords(rev.note.content),
          contentHash: fnv1a(JSON.stringify(rev.note.content)),
        },
      });

      // Restore the revision content
      return prisma.projectNote.update({
        where: { id: rev.note.id },
        data: { content: rev.content as Prisma.InputJsonValue },
      });
    }),

  /** Auto-snapshot — called by client every ~30 min, only creates if content changed */
  autoSnapshot: protectedProcedure
    .input(
      z.object({
        noteId: z.string(),
        contentHash: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertNoteAccess(input.noteId, ctx.user.id);

      const lastRev = await prisma.noteRevision.findFirst({
        where: { noteId: input.noteId },
        orderBy: { number: "desc" },
        select: { number: true, contentHash: true },
      });

      if (lastRev?.contentHash === input.contentHash) {
        return { created: false };
      }

      const note = await prisma.projectNote.findUnique({
        where: { id: input.noteId },
        select: { content: true },
      });
      if (!note) throw new TRPCError({ code: "NOT_FOUND" });

      const number = (lastRev?.number ?? 0) + 1;

      await prisma.noteRevision.create({
        data: {
          noteId: input.noteId,
          content: note.content as Prisma.InputJsonValue,
          number,
          createdBy: ctx.user.id,
          summary: "Auto-snapshot",
          wordCount: countWords(note.content),
          contentHash: input.contentHash,
        },
      });

      return { created: true };
    }),
});
