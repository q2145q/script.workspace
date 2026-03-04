import { z } from "zod";

export const createEpisodeSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1, "Title is required").max(255),
  number: z.number().int().positive().optional(),
});
export type CreateEpisodeInput = z.infer<typeof createEpisodeSchema>;

export const updateEpisodeSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(255).optional(),
  number: z.number().int().positive().optional(),
});
export type UpdateEpisodeInput = z.infer<typeof updateEpisodeSchema>;

export const deleteEpisodeSchema = z.object({
  id: z.string(),
});

export const listEpisodesSchema = z.object({
  projectId: z.string(),
});

export const reorderEpisodesSchema = z.object({
  projectId: z.string(),
  episodeIds: z.array(z.string()).min(1),
});
