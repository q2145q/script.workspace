import { createTRPCRouter } from "./trpc";
import { projectRouter } from "./routers/project";
import { documentRouter } from "./routers/document";
import { userRouter } from "./routers/user";
import { commentRouter } from "./routers/comment";
import { providerRouter } from "./routers/provider";
import { aiRouter } from "./routers/ai";
import { suggestionRouter } from "./routers/suggestion";
import { exportRouter } from "./routers/export";
import { chatRouter } from "./routers/chat";
import { bibleRouter } from "./routers/bible";
import { pinRouter } from "./routers/pin";
import { draftRouter } from "./routers/draft";
import { episodeRouter } from "./routers/episode";
import { entityRouter } from "./routers/entity";

export const appRouter = createTRPCRouter({
  project: projectRouter,
  document: documentRouter,
  user: userRouter,
  comment: commentRouter,
  provider: providerRouter,
  ai: aiRouter,
  suggestion: suggestionRouter,
  export: exportRouter,
  chat: chatRouter,
  bible: bibleRouter,
  pin: pinRouter,
  draft: draftRouter,
  episode: episodeRouter,
  entity: entityRouter,
});

export type AppRouter = typeof appRouter;
