import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@script/db";

export const reportRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(2000),
        page: z.string().optional(),
        context: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await prisma.userReport.create({
        data: {
          userId: ctx.user.id,
          message: input.message,
          page: input.page,
          context: input.context,
        },
      });
      return { success: true };
    }),
});
