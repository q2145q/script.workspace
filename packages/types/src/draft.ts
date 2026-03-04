import { z } from "zod";

export const createDraftSchema = z.object({
  documentId: z.string(),
  name: z.string().max(100).optional(),
});
export type CreateDraftInput = z.infer<typeof createDraftSchema>;

export const listDraftsSchema = z.object({
  documentId: z.string(),
});

export const getDraftSchema = z.object({
  id: z.string(),
});

export const restoreDraftSchema = z.object({
  id: z.string(),
});
