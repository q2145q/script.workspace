import { createTRPCRouter } from "./trpc";
import { projectRouter } from "./routers/project";
import { documentRouter } from "./routers/document";
import { userRouter } from "./routers/user";

export const appRouter = createTRPCRouter({
  project: projectRouter,
  document: documentRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
