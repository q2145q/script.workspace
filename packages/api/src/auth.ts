import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "@script/db";
import {
  sendEmail,
  verificationEmailTemplate,
  resetPasswordTemplate,
} from "./email";
import { notifyTelegramNewUser } from "./telegram";

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
      await sendEmail({
        to: user.email,
        subject: "Script Workspace — Сброс пароля",
        html: resetPasswordTemplate(user.name, url),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Script Workspace — Подтвердите email",
        html: verificationEmailTemplate(user.name, url),
      });
      // Notify admin via Telegram about new registration
      notifyTelegramNewUser(user).catch((err) =>
        console.error("[telegram] Failed to notify:", err)
      );
    },
  },
  trustedOrigins,
});
