import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "./auth";
import { checkRateLimit } from "./rate-limit";

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
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  // General rate limit: 100 req/min per user
  checkRateLimit(`user:${ctx.user.id}`, 100, 60_000);
  return next({
    ctx: {
      session: ctx.session,
      user: ctx.user,
    },
  });
});

/** Rate-limited procedure for AI endpoints: 10 req/min per user */
export const aiProcedure = protectedProcedure.use(({ ctx, next }) => {
  checkRateLimit(`ai:${ctx.user.id}`, 10, 60_000);
  return next({ ctx });
});
