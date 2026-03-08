import "dotenv/config";
import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { Logger } from "@hocuspocus/extension-logger";
import { Redis as HocuspocusRedis } from "@hocuspocus/extension-redis";
import Redis from "ioredis";
import { authenticateConnection } from "./auth.js";
import { loadDocument, storeDocument } from "./persistence.js";
import { checkPermissions } from "./permissions.js";
import { logActivity, logJoinLeave } from "./activity.js";
import { logger } from "./logger.js";

const port = parseInt(process.env.COLLAB_PORT || "3004");

// --- Redis-backed rate limiting ---
const RATE_LIMIT_PER_MINUTE = 120;
let redis: Redis | null = null;
const fallbackStore = new Map<string, { count: number; resetAt: number }>();

try {
  redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
    maxRetriesPerRequest: 1,
    lazyConnect: false,
  });
  redis.on("error", () => { /* handled silently, fallback used */ });
  logger.info("Redis rate limiter connected");
} catch {
  logger.warn("Redis unavailable, using in-memory rate limiter");
}

// Clean expired entries from fallbackStore every minute to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of fallbackStore) {
    if (now > entry.resetAt) fallbackStore.delete(key);
  }
}, 60_000);

async function checkRateLimit(userId: string, documentName: string): Promise<boolean> {
  const key = `ws:${userId}:${documentName}`;

  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 60);
      return count <= RATE_LIMIT_PER_MINUTE;
    } catch {
      // Fallback to in-memory
    }
  }

  const now = Date.now();
  const entry = fallbackStore.get(key);
  if (!entry || entry.resetAt < now) {
    fallbackStore.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_PER_MINUTE;
}

// --- Session re-validation interval ---
const SESSION_REVALIDATE_MS = 5 * 60 * 1000; // 5 minutes

const server = Server.configure({
  port,
  quiet: false,
  // Debounce persistence writes: wait 5s after last change, max 30s
  debounce: 5000,
  maxDebounce: 30000,

  // onConnect fires BEFORE onAuthenticate in Hocuspocus v2,
  // so we do nothing here — auth & permissions are in onAuthenticate.
  async onConnect() {
    // no-op: context not yet available
  },

  async onAuthenticate(data) {
    // 1. Authenticate user from cookies
    const result = await authenticateConnection({
      requestHeaders: data.requestHeaders,
    });

    // 2. Check permissions (must happen here, not in onConnect)
    await checkPermissions({
      documentName: data.documentName,
      context: { user: result.user },
      connection: data.connection,
    });

    // 3. Log join
    logJoinLeave("join", data.documentName, result.user).catch((err) => logger.error({ err }, "Join log failed"));

    // IMPORTANT: Return context additions — Hocuspocus merges them into
    // hookPayload.context via callback. Mutating data.context does NOT work
    // because data is a shallow copy and hookPayload.context gets reassigned.
    return {
      user: result.user,
      cookieHeader: data.requestHeaders.cookie || "",
    };
  },

  async onChange(data) {
    const context = data.context as { user: { id: string; name: string; email: string } };

    // Rate limiting: reject excessive changes
    if (context?.user && !(await checkRateLimit(context.user.id, data.documentName))) {
      logger.warn({ email: context.user.email, document: data.documentName }, "Rate limit exceeded");
      return;
    }

    logActivity({
      documentName: data.documentName,
      context,
    }).catch((err) => logger.error({ err }, "Activity log failed"));
  },

  async onDisconnect(data) {
    const user = (data.context as { user: { id: string; name: string; email: string } })?.user;
    if (user) {
      logJoinLeave("leave", data.documentName, user).catch((err) => logger.error({ err }, "Leave log failed"));
    }
  },

  extensions: [
    new Logger(),
    new HocuspocusRedis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT || "6379"),
    }),
    new Database({
      fetch: async ({ documentName }) => {
        return loadDocument({ documentName });
      },
      store: async ({ documentName, state }) => {
        try {
          await storeDocument({ documentName, state });
        } catch (error) {
          logger.error(
            { err: error instanceof Error ? error.message : error, document: documentName },
            "Failed to store document after all retries",
          );
          // Don't throw — Hocuspocus will keep the Y.Doc in memory
          // and retry on next change. Throwing crashes the connection.
        }
      },
    }),
  ],
});

server.listen();

logger.info({ port }, "Collab server running");

// Periodic session re-validation: disconnect users with expired/revoked sessions
setInterval(async () => {
  for (const [docName, doc] of server.documents) {
    for (const conn of doc.getConnections()) {
      const ctx = conn.context as {
        user?: { id: string; name: string; email: string };
        cookieHeader?: string;
      };
      if (!ctx?.user || !ctx?.cookieHeader) continue;

      try {
        // Re-validate session
        await authenticateConnection({
          requestHeaders: { cookie: ctx.cookieHeader },
        });
        // Re-check permissions (role may have changed)
        await checkPermissions({
          documentName: docName,
          context: { user: ctx.user },
          connection: conn,
        });
      } catch {
        logger.info({ email: ctx.user.email, document: docName }, "Session/permission expired, disconnecting");
        try {
          conn.close();
        } catch {
          // Connection may already be closed
        }
      }
    }
  }
}, SESSION_REVALIDATE_MS);
