import { z } from "zod";
import { tipTapContentSchema } from "./editor";

export const getBibleSchema = z.object({
  projectId: z.string(),
});
export type GetBibleInput = z.infer<typeof getBibleSchema>;

export const saveBibleSchema = z.object({
  projectId: z.string(),
  content: tipTapContentSchema,
});
export type SaveBibleInput = z.infer<typeof saveBibleSchema>;
