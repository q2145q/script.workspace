import { serverApi } from "@/lib/trpc/server";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default async function ScriptEditorPage({
  params,
}: {
  params: Promise<{ projectId: string; documentId: string }>;
}) {
  const { projectId, documentId } = await params;
  const api = await serverApi();

  const [project, document] = await Promise.all([
    api.project.getById({ id: projectId }),
    api.document.getById({ id: documentId }),
  ]);

  return (
    <WorkspaceShell
      project={project}
      document={document}
    />
  );
}
