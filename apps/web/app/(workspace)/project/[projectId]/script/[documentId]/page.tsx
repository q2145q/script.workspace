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

  const api = await serverApi();

  const [project, document] = await Promise.all([
    api.project.getById({ id: projectId }),
    api.document.getById({ id: documentId }),
  ]);

  return (
    <WorkspaceShell
      project={project}
      document={document}
      currentUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    />
  );
}
