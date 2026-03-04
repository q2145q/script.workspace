import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@script/db";
import {
  createCommentThreadSchema,
  createCommentMessageSchema,
} from "@script/types";

/** Check user has access to a document (owner or any member role) */
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
    include: {
      project: {
        include: {
          members: { where: { userId }, select: { role: true } },
        },
      },
    },
  });
  if (!doc) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  const isOwner = doc.project.ownerId === userId;
  const memberRole = doc.project.members[0]?.role;
  return { doc, isOwner, memberRole };
}

/** Check user can comment (OWNER, EDITOR, or COMMENTER) */
function assertCanComment(isOwner: boolean, memberRole?: string) {
  if (isOwner) return;
  if (memberRole && ["OWNER", "EDITOR", "COMMENTER"].includes(memberRole))
    return;
  throw new TRPCError({ code: "FORBIDDEN" });
}

export const commentRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertDocumentAccess(input.documentId, ctx.user.id);

      return prisma.commentThread.findMany({
        where: { documentId: input.documentId },
        include: {
          createdBy: { select: { id: true, name: true, image: true } },
          messages: {
            include: {
              author: { select: { id: true, name: true, image: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { anchorFrom: "asc" },
      });
    }),

  create: protectedProcedure
    .input(createCommentThreadSchema)
    .mutation(async ({ ctx, input }) => {
      const { isOwner, memberRole } = await assertDocumentAccess(
        input.documentId,
        ctx.user.id
      );
      assertCanComment(isOwner, memberRole);

      return prisma.$transaction(async (tx) => {
        const thread = await tx.commentThread.create({
          data: {
            documentId: input.documentId,
            anchorFrom: input.anchorFrom,
            anchorTo: input.anchorTo,
            createdById: ctx.user.id,
          },
        });

        await tx.commentMessage.create({
          data: {
            threadId: thread.id,
            authorId: ctx.user.id,
            content: input.content,
          },
        });

        return tx.commentThread.findUniqueOrThrow({
          where: { id: thread.id },
          include: {
            createdBy: { select: { id: true, name: true, image: true } },
            messages: {
              include: {
                author: { select: { id: true, name: true, image: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        });
      });
    }),

  resolve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const thread = await prisma.commentThread.findUnique({
        where: { id: input.id },
        include: { document: { select: { projectId: true, project: { select: { ownerId: true, members: { where: { userId: ctx.user.id }, select: { role: true } } } } } } },
      });
      if (!thread) throw new TRPCError({ code: "NOT_FOUND" });

      const isProjectOwner =
        thread.document.project.ownerId === ctx.user.id;
      const memberRole = thread.document.project.members[0]?.role;
      const isThreadCreator = thread.createdById === ctx.user.id;

      if (
        !isThreadCreator &&
        !isProjectOwner &&
        memberRole !== "OWNER" &&
        memberRole !== "EDITOR"
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return prisma.commentThread.update({
        where: { id: input.id },
        data: { resolved: !thread.resolved },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const thread = await prisma.commentThread.findUnique({
        where: { id: input.id },
        include: {
          document: {
            select: {
              projectId: true,
              project: {
                select: {
                  ownerId: true,
                  members: {
                    where: { userId: ctx.user.id },
                    select: { role: true },
                  },
                },
              },
            },
          },
        },
      });
      if (!thread) throw new TRPCError({ code: "NOT_FOUND" });

      const isProjectOwner =
        thread.document.project.ownerId === ctx.user.id;
      const memberRole = thread.document.project.members[0]?.role;
      const isThreadCreator = thread.createdById === ctx.user.id;

      if (
        !isThreadCreator &&
        !isProjectOwner &&
        memberRole !== "OWNER" &&
        memberRole !== "EDITOR"
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await prisma.commentThread.delete({ where: { id: input.id } });
      return { id: input.id };
    }),

  addMessage: protectedProcedure
    .input(createCommentMessageSchema)
    .mutation(async ({ ctx, input }) => {
      const thread = await prisma.commentThread.findUnique({
        where: { id: input.threadId },
        select: { documentId: true },
      });
      if (!thread) throw new TRPCError({ code: "NOT_FOUND" });

      const { isOwner, memberRole } = await assertDocumentAccess(
        thread.documentId,
        ctx.user.id
      );
      assertCanComment(isOwner, memberRole);

      return prisma.commentMessage.create({
        data: {
          threadId: input.threadId,
          authorId: ctx.user.id,
          content: input.content,
        },
        include: {
          author: { select: { id: true, name: true, image: true } },
        },
      });
    }),
});
