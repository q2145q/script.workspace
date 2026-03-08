import Redis from "ioredis";
import { logger } from "./logger";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 5) return null; // stop retrying after 5 attempts
    return Math.min(times * 200, 2000);
  },
});

redis.on("error", (err) => {
  logger.error({ err: err.message }, "Redis connection error");
});

let connected = false;

/** Ensure Redis is connected; returns false if unavailable */
export async function ensureRedis(): Promise<boolean> {
  if (connected) return true;
  try {
    await redis.connect();
    connected = true;
    return true;
  } catch {
    return false;
  }
}
