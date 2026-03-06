import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "@script/db";
import { parse as parseCookie } from "cookie";
import type { IncomingHttpHeaders } from "http";

const collabAuth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
});

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
}

export async function authenticateConnection(data: {
  requestHeaders: IncomingHttpHeaders;
}): Promise<{ user: AuthenticatedUser }> {
  const cookieHeader = data.requestHeaders.cookie || "";
  const cookies = parseCookie(cookieHeader);

  const sessionToken =
    cookies["better-auth.session_token"] ||
    cookies["__Secure-better-auth.session_token"];

  if (!sessionToken) {
    throw new Error("Unauthorized: no session cookie");
  }

  const headers = new Headers();
  headers.set("cookie", cookieHeader);

  const session = await collabAuth.api.getSession({ headers });

  if (!session?.user) {
    throw new Error("Unauthorized: invalid session");
  }

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
  };
}
