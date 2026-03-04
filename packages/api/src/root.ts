import { createTRPCRouter } from "./trpc";
import { projectRouter } from "./routers/project";
import { documentRouter } from "./routers/document";
import { userRouter } from "./routers/user";
import { commentRouter } from "./routers/comment";
import { providerRouter } from "./routers/provider";
import { aiRouter } from "./routers/ai";
import { suggestionRouter } from "./routers/suggestion";

export const appRouter = createTRPCRouter({
  project: projectRouter,
  document: documentRouter,
  user: userRouter,
  comment: commentRouter,
  provider: providerRouter,
  ai: aiRouter,
  suggestion: suggestionRouter,
});

export type AppRouter = typeof appRouter;
