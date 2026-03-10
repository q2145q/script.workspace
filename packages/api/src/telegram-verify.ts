import { randomUUID } from "crypto";
import { redis, ensureRedis } from "./redis";

const TOKEN_TTL = 3600; // 1 hour
const TOKEN_PREFIX = "tg_verify:";
const EMAIL_PREFIX = "tg_verify_email:";

export async function createTelegramVerifyToken(
  userId: string,
  email: string,
): Promise<string> {
  await ensureRedis();

  // Invalidate previous token for this email
  const oldToken = await redis.get(`${EMAIL_PREFIX}${email}`);
  if (oldToken) {
    await redis.del(`${TOKEN_PREFIX}${oldToken}`);
  }

  const token = randomUUID();
  await redis.setex(`${TOKEN_PREFIX}${token}`, TOKEN_TTL, userId);
  await redis.setex(`${EMAIL_PREFIX}${email}`, TOKEN_TTL, token);

  return token;
}

export async function resolveVerifyToken(token: string): Promise<string | null> {
  await ensureRedis();
  return redis.get(`${TOKEN_PREFIX}${token}`);
}

export async function getTokenByEmail(email: string): Promise<string | null> {
  await ensureRedis();
  return redis.get(`${EMAIL_PREFIX}${email}`);
}

export async function deleteVerifyToken(token: string, email: string): Promise<void> {
  await ensureRedis();
  await redis.del(`${TOKEN_PREFIX}${token}`, `${EMAIL_PREFIX}${email}`);
}
