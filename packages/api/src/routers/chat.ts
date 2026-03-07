import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@script/db";
import { listChatMessagesSchema, clearChatSchema } from "@script/types";
import { assertProjectAccess } from "../access";

export const chatRouter = createTRPCRouter({
  /** List chat messages for a project (newest last) */
  list: protectedProcedure
    .input(listChatMessagesSchema)
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);

      const messages = await prisma.chatMessage.findMany({
        where: {
          projectId: input.projectId,
          userId: ctx.user.id,
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

  /** Clear current user's chat history for a project */
  clear: protectedProcedure
    .input(clearChatSchema)
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);

      // Each user can only clear their own chat
      await prisma.chatMessage.deleteMany({
        where: { projectId: input.projectId, userId: ctx.user.id },
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
