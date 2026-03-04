import { z } from "zod";

// ============================================================
// Characters
// ============================================================

export const createCharacterSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(5000).optional(),
  traits: z.array(z.string().max(100)).max(20).default([]),
});
export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;

export const updateCharacterSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  traits: z.array(z.string().max(100)).max(20).optional(),
});
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>;

export const deleteCharacterSchema = z.object({ id: z.string() });
export const listCharactersSchema = z.object({ projectId: z.string() });

// ============================================================
// Locations
// ============================================================

export const createLocationSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(5000).optional(),
});
export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export const updateLocationSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
});
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

export const deleteLocationSchema = z.object({ id: z.string() });
export const listLocationsSchema = z.object({ projectId: z.string() });

// ============================================================
// Terms
// ============================================================

export const createTermSchema = z.object({
  projectId: z.string(),
  term: z.string().min(1, "Term is required").max(255),
  definition: z.string().max(5000).optional(),
});
export type CreateTermInput = z.infer<typeof createTermSchema>;

export const updateTermSchema = z.object({
  id: z.string(),
  term: z.string().min(1).max(255).optional(),
  definition: z.string().max(5000).optional(),
});
export type UpdateTermInput = z.infer<typeof updateTermSchema>;

export const deleteTermSchema = z.object({ id: z.string() });
export const listTermsSchema = z.object({ projectId: z.string() });
