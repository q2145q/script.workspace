import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma, type Prisma } from "@script/db";
import { tipTapContentSchema } from "@script/types";

/** Check document access */
async function assertEditorAccess(documentId: string, userId: string) {
  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      deletedAt: null,
      project: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId, role: { in: ["OWNER", "EDITOR"] } } } },
        ],
      },
    },
    select: { id: true, projectId: true },
  });
  if (!doc) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Document not found or no access" });
  }
  return doc;
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

export const revisionRouter = createTRPCRouter({
  /** List revisions for a document (newest first) */
  list: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await assertEditorAccess(input.documentId, ctx.user.id);

      const revisions = await prisma.documentRevision.findMany({
        where: { documentId: input.documentId },
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
        documentId: z.string(),
        summary: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertEditorAccess(input.documentId, ctx.user.id);

      // Get current document content
      const doc = await prisma.document.findUnique({
        where: { id: input.documentId },
        select: { content: true },
      });
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });

      // Get next revision number
      const last = await prisma.documentRevision.findFirst({
        where: { documentId: input.documentId },
        orderBy: { number: "desc" },
        select: { number: true },
      });

      const number = (last?.number ?? 0) + 1;
      const contentStr = JSON.stringify(doc.content);

      return prisma.documentRevision.create({
        data: {
          documentId: input.documentId,
          content: doc.content as Prisma.InputJsonValue,
          number,
          createdBy: ctx.user.id,
          summary: input.summary,
          wordCount: countWords(doc.content),
          contentHash: fnv1a(contentStr),
        },
      });
    }),

  /** Get full revision content */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rev = await prisma.documentRevision.findUnique({
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
      if (!rev) throw new TRPCError({ code: "NOT_FOUND" });

      const hasAccess =
        rev.document.project.ownerId === ctx.user.id ||
        rev.document.project.members.some((m) => m.userId === ctx.user.id);
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });

      return rev;
    }),

  /** Restore a revision — overwrites document content */
  restore: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rev = await prisma.documentRevision.findUnique({
        where: { id: input.id },
        include: {
          document: {
            select: {
              id: true,
              content: true,
              project: {
                select: {
                  ownerId: true,
                  members: { select: { userId: true, role: true } },
                },
              },
            },
          },
        },
      });
      if (!rev) throw new TRPCError({ code: "NOT_FOUND" });

      const isEditor =
        rev.document.project.ownerId === ctx.user.id ||
        rev.document.project.members.some(
          (m) => m.userId === ctx.user.id && (m.role === "OWNER" || m.role === "EDITOR")
        );
      if (!isEditor) throw new TRPCError({ code: "FORBIDDEN" });

      // Create backup revision of current content first
      const last = await prisma.documentRevision.findFirst({
        where: { documentId: rev.document.id },
        orderBy: { number: "desc" },
        select: { number: true },
      });

      const backupNumber = (last?.number ?? 0) + 1;

      await prisma.documentRevision.create({
        data: {
          documentId: rev.document.id,
          content: rev.document.content as Prisma.InputJsonValue,
          number: backupNumber,
          createdBy: ctx.user.id,
          summary: `Backup before restoring revision #${rev.number}`,
          wordCount: countWords(rev.document.content),
          contentHash: fnv1a(JSON.stringify(rev.document.content)),
        },
      });

      // Restore the revision content
      return prisma.document.update({
        where: { id: rev.document.id },
        data: { content: rev.content as Prisma.InputJsonValue },
      });
    }),

  /** Auto-snapshot — called by client every ~30 min, only creates if content changed */
  autoSnapshot: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        contentHash: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertEditorAccess(input.documentId, ctx.user.id);

      // Check if hash changed since last revision
      const lastRev = await prisma.documentRevision.findFirst({
        where: { documentId: input.documentId },
        orderBy: { number: "desc" },
        select: { number: true, contentHash: true },
      });

      if (lastRev?.contentHash === input.contentHash) {
        return { created: false };
      }

      const doc = await prisma.document.findUnique({
        where: { id: input.documentId },
        select: { content: true },
      });
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });

      const number = (lastRev?.number ?? 0) + 1;

      await prisma.documentRevision.create({
        data: {
          documentId: input.documentId,
          content: doc.content as Prisma.InputJsonValue,
          number,
          createdBy: ctx.user.id,
          summary: "Auto-snapshot",
          wordCount: countWords(doc.content),
          contentHash: input.contentHash,
        },
      });

      return { created: true };
    }),
});
