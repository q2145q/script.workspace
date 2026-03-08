import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "./auth";
import { checkRateLimit } from "./rate-limit";
import { logger } from "./logger";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth.api.getSession({
    headers: opts.headers,
  });

  return {
    session,
    user: session?.user ?? null,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const mergeRouters = t.mergeRouters;
export const createCallerFactory = t.createCallerFactory;

const SLOW_REQUEST_MS = 2000;

/** Timing middleware: logs slow requests and errors */
const timingMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = performance.now();
  const result = await next();
  const durationMs = Math.round(performance.now() - start);

  if (!result.ok) {
    logger.error({ type, path, durationMs, error: (result.error as { code?: string })?.code }, "tRPC request failed");
  } else if (durationMs > SLOW_REQUEST_MS) {
    logger.warn({ type, path, durationMs }, "Slow tRPC request");
  }

  return result;
});

export const publicProcedure = t.procedure.use(timingMiddleware);

export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  // General rate limit: 100 req/min per user
  await checkRateLimit(`user:${ctx.user.id}`, 100, 60_000);
  return next({
    ctx: {
      session: ctx.session,
      user: ctx.user,
    },
  });
});

/** Rate-limited procedure for AI endpoints: 10 req/min per user */
export const aiProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  await checkRateLimit(`ai:${ctx.user.id}`, 10, 60_000);
  return next({ ctx });
});
