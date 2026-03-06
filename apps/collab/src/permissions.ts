import { prisma } from "@script/db";
import type { AuthenticatedUser } from "./auth";

export async function checkPermissions(data: {
  documentName: string;
  context: { user: AuthenticatedUser };
  connection: { readOnly: boolean };
}): Promise<void> {
  const { documentName, context, connection } = data;
  const [type, id] = documentName.split(":");
  const userId = context.user.id;

  let projectId: string;

  if (type === "document") {
    const doc = await prisma.document.findUnique({
      where: { id },
      select: { projectId: true },
    });
    if (!doc) throw new Error("Document not found");
    projectId = doc.projectId;
  } else if (type === "bible") {
    projectId = id;
  } else if (type === "note") {
    const note = await prisma.projectNote.findUnique({
      where: { id },
      select: { projectId: true },
    });
    if (!note) throw new Error("Note not found");
    projectId = note.projectId;
  } else {
    throw new Error(`Unknown document type: ${type}`);
  }

  // Check if user is project owner
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project) throw new Error("Project not found");

  if (project.ownerId === userId) {
    // Owner has full access
    return;
  }

  // Check membership
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
    select: { role: true },
  });

  if (!member) {
    throw new Error("Access denied: not a project member");
  }

  // VIEWER and COMMENTER are read-only
  if (member.role === "VIEWER" || member.role === "COMMENTER") {
    connection.readOnly = true;
  }
}
