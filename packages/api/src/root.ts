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
import { memberRouter } from "./routers/member";
import { activityRouter } from "./routers/activity";
import { noteRouter } from "./routers/note";
import { noteRevisionRouter } from "./routers/note-revision";
import { sceneMetadataRouter } from "./routers/scene-metadata";
import { revisionRouter } from "./routers/revision";
import { searchRouter } from "./routers/search";
import { notificationRouter } from "./routers/notification";
import { reportRouter } from "./routers/report";

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
  member: memberRouter,
  activity: activityRouter,
  note: noteRouter,
  noteRevision: noteRevisionRouter,
  sceneMetadata: sceneMetadataRouter,
  revision: revisionRouter,
  search: searchRouter,
  notification: notificationRouter,
  report: reportRouter,
});

export type AppRouter = typeof appRouter;
