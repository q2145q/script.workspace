import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "@script/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [
    "http://localhost:3001",
    "http://localhost:3002",
    "http://164.90.224.171:3001",
    "http://164.90.224.171:3002",
    "https://script.yomimovie.art",
  ],
});
