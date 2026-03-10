import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { prisma } from "@script/db";
import {
  getTokenByEmail,
  createTelegramVerifyToken,
} from "../telegram-verify";

export const authVerifyRouter = createTRPCRouter({
  getTelegramToken: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const token = await getTokenByEmail(input.email);
      return { token };
    }),

  checkVerification: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { email: input.email },
        select: { emailVerified: true },
      });
      return { verified: user?.emailVerified ?? false };
    }),

  resendTelegramVerify: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true, emailVerified: true },
      });

      if (!user || user.emailVerified) {
        return { ok: true };
      }

      await createTelegramVerifyToken(user.id, input.email);
      return { ok: true };
    }),
});
