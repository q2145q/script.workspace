import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "@script/db";
import { sendEmail, resetPasswordTemplate } from "./email";
import { notifyTelegramNewUser, sendResetLinkViaTelegram } from "./telegram";
import { createTelegramVerifyToken } from "./telegram-verify";

const defaultOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://script.yomimovie.art"]
    : ["http://localhost:3001", "http://localhost:3002"];

const trustedOrigins = process.env.TRUSTED_ORIGINS
  ? process.env.TRUSTED_ORIGINS.split(",").map((o) => o.trim())
  : defaultOrigins;

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { telegramChatId: true },
      });

      if (dbUser?.telegramChatId) {
        await sendResetLinkViaTelegram(dbUser.telegramChatId, user.name, url);
      } else {
        // Fallback to email (will work when SMTP is available)
        await sendEmail({
          to: user.email,
          subject: "YOMI Script — Сброс пароля",
          html: resetPasswordTemplate(user.name, url),
        });
      }
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Create Telegram verification token
          try {
            await createTelegramVerifyToken(user.id, user.email);
          } catch (err) {
            console.error("[auth] Failed to create verification token:", err);
          }
          // Notify admin about new registration
          try {
            await notifyTelegramNewUser(user);
          } catch (err) {
            console.error("[telegram] Failed to notify admin:", err);
          }
        },
      },
    },
  },
  trustedOrigins,
});
