import { serverApi } from "@/lib/trpc/server";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { auth } from "@script/api/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ScriptEditorPage({
  params,
}: {
  params: Promise<{ projectId: string; documentId: string }>;
}) {
  const { projectId, documentId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/sign-in");
  }

  let project, document;
  try {
    const api = await serverApi();
    [project, document] = await Promise.all([
      api.project.getById({ id: projectId }),
      api.document.getById({ id: documentId }),
    ]);
  } catch {
    redirect("/dashboard");
  }

  if (!project || !document) {
    redirect("/dashboard");
  }

  // Strip Prisma objects to plain serializable props to avoid
  // RSC serialization stack overflow (Maximum call stack size exceeded)
  return (
    <WorkspaceShell
      project={{
        id: project.id,
        title: project.title,
        type: project.type,
        documents: project.documents.map((d: { id: string; title: string }) => ({
          id: d.id,
          title: d.title,
        })),
        episodes: project.episodes?.map(
          (e: { id: string; title: string; number: number; document: { id: string; title: string } }) => ({
            id: e.id,
            title: e.title,
            number: e.number,
            document: { id: e.document.id, title: e.document.title },
          })
        ),
      }}
      document={{
        id: document.id,
        title: document.title,
        content: document.content,
      }}
      currentUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    />
  );
}
