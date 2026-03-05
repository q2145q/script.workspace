import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@script/db";
import { listChatMessagesSchema, clearChatSchema } from "@script/types";

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

export const chatRouter = createTRPCRouter({
  /** List chat messages for a project (newest last) */
  list: protectedProcedure
    .input(listChatMessagesSchema)
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);

      const messages = await prisma.chatMessage.findMany({
        where: {
          projectId: input.projectId,
          ...(input.cursor ? { createdAt: { lt: new Date(input.cursor) } } : {}),
        },
        orderBy: { createdAt: "asc" },
        take: input.limit,
      });

      return {
        messages,
        nextCursor: messages.length === input.limit
          ? messages[messages.length - 1].createdAt.toISOString()
          : undefined,
      };
    }),

  /** Clear all chat history for a project */
  clear: protectedProcedure
    .input(clearChatSchema)
    .mutation(async ({ ctx, input }) => {
      const project = await assertProjectAccess(input.projectId, ctx.user.id);

      // Only owner or editors can clear chat
      if (project.ownerId !== ctx.user.id) {
        const member = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId: input.projectId, userId: ctx.user.id } },
        });
        if (!member || !["OWNER", "EDITOR"].includes(member.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      await prisma.chatMessage.deleteMany({
        where: { projectId: input.projectId },
      });

      return { success: true };
    }),

  /** Check if any global AI provider is configured */
  status: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);

      const activeCount = await prisma.globalApiKey.count({
        where: { isActive: true },
      });

      return {
        hasProvider: activeCount > 0,
      };
    }),
});
