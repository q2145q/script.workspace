import { z } from "zod";

export const getBibleSchema = z.object({
  projectId: z.string(),
});
export type GetBibleInput = z.infer<typeof getBibleSchema>;

export const saveBibleSchema = z.object({
  projectId: z.string(),
  content: z.any(),
});
export type SaveBibleInput = z.infer<typeof saveBibleSchema>;
