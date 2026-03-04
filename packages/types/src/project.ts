import { z } from "zod";

export const ProjectTypeEnum = z.enum([
  "FEATURE_FILM",
  "TV_SERIES",
  "SHORT_FILM",
  "OTHER",
]);
export type ProjectType = z.infer<typeof ProjectTypeEnum>;

export const ProjectRoleEnum = z.enum([
  "OWNER",
  "EDITOR",
  "COMMENTER",
  "VIEWER",
]);
export type ProjectRole = z.infer<typeof ProjectRoleEnum>;

export const createProjectSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(2000).optional(),
  type: ProjectTypeEnum.default("FEATURE_FILM"),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
] as const;

export const updateProjectSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  type: ProjectTypeEnum.optional(),
  language: z.string().min(2).max(5).optional(),
});
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
