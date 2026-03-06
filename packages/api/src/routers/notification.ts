import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@script/db";

export const notificationRouter = createTRPCRouter({
  /** List notifications for the current user (newest first) */
  list: protectedProcedure
    .input(
      z
        .object({
          cursor: z.string().optional(),
          limit: z.number().int().min(1).max(50).default(20),
          unreadOnly: z.boolean().default(false),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit = 20, unreadOnly = false } = input ?? {};

      const items = await prisma.notification.findMany({
        where: {
          userId: ctx.user.id,
          ...(unreadOnly ? { read: false } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return { items, nextCursor };
    }),

  /** Count unread notifications */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await prisma.notification.count({
      where: { userId: ctx.user.id, read: false },
    });
    return { count };
  }),

  /** Mark a single notification as read */
  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.notification.updateMany({
        where: { id: input.id, userId: ctx.user.id },
        data: { read: true },
      });
      return { success: true };
    }),

  /** Mark all notifications as read */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await prisma.notification.updateMany({
      where: { userId: ctx.user.id, read: false },
      data: { read: true },
    });
    return { count: result.count };
  }),

  /** Delete a notification */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.notification.deleteMany({
        where: { id: input.id, userId: ctx.user.id },
      });
      return { success: true };
    }),
});
