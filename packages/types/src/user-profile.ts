import { z } from "zod";

export const POSITIONS = [
  "Writer",
  "Director",
  "Producer",
  "Showrunner",
  "Story Editor",
  "Script Coordinator",
  "Development Executive",
  "Other",
] as const;

export const updateProfileSchema = z.object({
  lastName: z.string().max(255),
  position: z.string().min(1).max(255),
  company: z.string().max(255).optional().nullable(),
  defaultLanguage: z.string().min(2).max(5),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
