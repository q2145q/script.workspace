import { TRPCError } from "@trpc/server";
import { redis, ensureRedis } from "./redis";

let useRedis = false;

// Try to connect to Redis on startup
ensureRedis().then((ok) => {
  useRedis = ok;
  if (ok) console.log("[rate-limit] Using Redis backend");
  else console.warn("[rate-limit] Redis unavailable, using in-memory fallback");
});

// --- In-memory fallback ---
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000).unref();

function checkInMemory(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= maxRequests;
}

// --- Redis implementation ---
async function checkRedis(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
  try {
    const redisKey = `rl:${key}`;
    const windowSec = Math.ceil(windowMs / 1000);
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSec);
    }
    return count <= maxRequests;
  } catch {
    // Fallback to in-memory on Redis error
    return checkInMemory(key, maxRequests, windowMs);
  }
}

/**
 * Check rate limit for a given key.
 * Throws TRPCError if limit exceeded.
 */
export async function checkRateLimit(key: string, maxRequests: number, windowMs: number): Promise<void> {
  const allowed = useRedis
    ? await checkRedis(key, maxRequests, windowMs)
    : checkInMemory(key, maxRequests, windowMs);

  if (!allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded. Please try again later.",
    });
  }
}

/**
 * Non-throwing rate limit check (for non-tRPC contexts).
 * Returns true if allowed, false if exceeded.
 */
export async function isRateLimited(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
  const allowed = useRedis
    ? await checkRedis(key, maxRequests, windowMs)
    : checkInMemory(key, maxRequests, windowMs);
  return !allowed;
}
