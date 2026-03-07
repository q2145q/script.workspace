import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const ADMIN_LOGIN = process.env.ADMIN_LOGIN || "";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";
const COOKIE_NAME = "admin_session";
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;

if (!SESSION_SECRET) {
  console.warn("[admin] ADMIN_SESSION_SECRET is not set — admin sessions will not work securely");
}

function signToken(token: string): string {
  return createHash("sha256").update(token + (SESSION_SECRET || "")).digest("hex");
}

// Rate limiting: 5 attempts per 15 minutes per IP
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_LOGIN_ATTEMPTS;
}

export async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "unknown";
}

export async function validateCredentials(login: string, password: string): Promise<boolean> {
  if (login !== ADMIN_LOGIN) return false;
  if (!ADMIN_PASSWORD_HASH) return false;
  return bcrypt.compare(password, ADMIN_PASSWORD_HASH);
}

export async function createSession(): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const signature = signToken(token);
  const value = `${token}.${signature}`;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 2, // 2 hours
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
