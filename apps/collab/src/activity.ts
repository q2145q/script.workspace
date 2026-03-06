import { prisma } from "@script/db";
import type { AuthenticatedUser } from "./auth";

// Debounce map: key = `${userId}:${documentName}`, value = last log timestamp
const lastLogTime = new Map<string, number>();
const DEBOUNCE_MS = 30_000; // 30 seconds

async function getProjectId(
  type: string,
  id: string
): Promise<string> {
  if (type === "bible") return id;

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { projectId: true },
  });
  return doc?.projectId ?? id;
}

export async function logActivity(data: {
  documentName: string;
  context: { user: AuthenticatedUser };
}): Promise<void> {
  const { documentName, context } = data;
  const key = `${context.user.id}:${documentName}`;
  const now = Date.now();
  const last = lastLogTime.get(key) ?? 0;

  if (now - last < DEBOUNCE_MS) return;
  lastLogTime.set(key, now);

  const [type, id] = documentName.split(":");
  const projectId = await getProjectId(type, id);

  await prisma.activityLog.create({
    data: {
      projectId,
      documentId: type === "document" ? id : undefined,
      userId: context.user.id,
      action: "edit",
      details: {
        userName: context.user.name,
        documentType: type,
      },
    },
  });
}

export async function logJoinLeave(
  action: "join" | "leave",
  documentName: string,
  user: AuthenticatedUser
): Promise<void> {
  const [type, id] = documentName.split(":");
  const projectId = await getProjectId(type, id);

  await prisma.activityLog.create({
    data: {
      projectId,
      documentId: type === "document" ? id : undefined,
      userId: user.id,
      action,
      details: {
        userName: user.name,
        documentType: type,
      },
    },
  });
}
