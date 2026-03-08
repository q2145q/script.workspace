import { mergeRouters } from "../../trpc";
import { rewriteRouter } from "./rewrite";
import { analysisRouter } from "./analysis";
import { generationRouter } from "./generation";

export const aiRouter = mergeRouters(rewriteRouter, analysisRouter, generationRouter);
