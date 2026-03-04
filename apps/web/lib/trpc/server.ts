import "server-only";

import { headers } from "next/headers";
import { createTRPCContext, createCallerFactory } from "@script/api";
import { appRouter } from "@script/api";

const createCaller = createCallerFactory(appRouter);

export async function serverApi() {
  const h = await headers();
  const ctx = await createTRPCContext({ headers: h });
  return createCaller(ctx);
}
