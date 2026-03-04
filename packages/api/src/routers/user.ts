import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@script/db";
import { updateProfileSchema } from "@script/types";

async function ensureProfile(userId: string) {
  return prisma.userProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ensureProfile(ctx.user.id);
    return {
      ...ctx.user,
      profile,
    };
  }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return ensureProfile(ctx.user.id);
  }),

  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      return prisma.userProfile.upsert({
        where: { userId: ctx.user.id },
        create: {
          userId: ctx.user.id,
          ...input,
        },
        update: input,
      });
    }),
});
