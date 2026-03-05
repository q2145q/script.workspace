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

export const ProjectStatusEnum = z.enum([
  "DRAFT",
  "IN_PROGRESS",
  "UNDER_REVIEW",
  "FINAL",
  "ARCHIVED",
]);
export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  UNDER_REVIEW: "Under Review",
  FINAL: "Final",
  ARCHIVED: "Archived",
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  DRAFT: "bg-zinc-500/20 text-zinc-400",
  IN_PROGRESS: "bg-blue-500/20 text-blue-400",
  UNDER_REVIEW: "bg-amber-500/20 text-amber-400",
  FINAL: "bg-green-500/20 text-green-400",
  ARCHIVED: "bg-gray-500/20 text-gray-400",
};

export const updateProjectSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  type: ProjectTypeEnum.optional(),
  language: z.string().min(2).max(5).optional(),
  status: ProjectStatusEnum.optional(),
  preferredProvider: z.string().nullish(),
  preferredModel: z.string().nullish(),
  logline: z.string().max(1000).nullish(),
  synopsis: z.string().max(10000).nullish(),
  knowledgeGraph: z.any().nullish(),
});
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// ============================================================
// MEMBER SCHEMAS
// ============================================================

export const MemberRoleEnum = z.enum(["EDITOR", "COMMENTER", "VIEWER"]);
export type MemberRole = z.infer<typeof MemberRoleEnum>;

export const inviteMemberSchema = z.object({
  projectId: z.string(),
  email: z.string().email(),
  role: MemberRoleEnum,
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({
  projectId: z.string(),
  userId: z.string(),
  role: MemberRoleEnum,
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const removeMemberSchema = z.object({
  projectId: z.string(),
  userId: z.string(),
});
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
