import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";

const ADMIN_LOGIN = "q2145q";
const ADMIN_PASSWORD = "Chopchop1997";
const COOKIE_NAME = "admin_session";
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || process.env.AI_ENCRYPTION_SECRET || "admin-fallback-secret";

function signToken(token: string): string {
  return createHash("sha256").update(token + SESSION_SECRET).digest("hex");
}

export function validateCredentials(login: string, password: string): boolean {
  return login === ADMIN_LOGIN && password === ADMIN_PASSWORD;
}

export async function createSession(): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const signature = signToken(token);
  const value = `${token}.${signature}`;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function validateSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return false;

  const dotIdx = value.indexOf(".");
  if (dotIdx === -1) return false;

  const token = value.slice(0, dotIdx);
  const signature = value.slice(dotIdx + 1);

  return signToken(token) === signature;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
