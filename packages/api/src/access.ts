import { TRPCError } from "@trpc/server";
import { prisma } from "@script/db";

/** Where clause for "user can view project" (owner or any member) */
export function projectAccessWhere(userId: string) {
  return {
    OR: [
      { ownerId: userId },
      { members: { some: { userId } } },
    ],
  };
}

/** Where clause for "user can edit project" (owner or EDITOR role) */
export function editorAccessWhere(userId: string) {
  return {
    OR: [
      { ownerId: userId },
      { members: { some: { userId, role: { in: ["OWNER", "EDITOR"] } } } },
    ],
  };
}

/**
 * Assert the user has view-level access to a project.
 * Throws TRPCError NOT_FOUND if not.
 */
export async function assertProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null, ...projectAccessWhere(userId) },
    select: { id: true, ownerId: true },
  });
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found or no access" });
  }
  return project;
}

/**
 * Assert the user has editor-level access to a project.
 * Throws TRPCError FORBIDDEN if not.
 */
export async function assertEditorAccess(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null, ...editorAccessWhere(userId) },
    select: { id: true, ownerId: true },
  });
  if (!project) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Editor access required" });
  }
  return project;
}
