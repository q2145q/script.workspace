import { redirect } from "next/navigation";
import { serverApi } from "@/lib/trpc/server";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const api = await serverApi();
  const project = await api.project.getById({ id: projectId });

  // For TV_SERIES, redirect to first episode's document
  if (project.type === "TV_SERIES" && project.episodes.length > 0) {
    redirect(`/project/${projectId}/script/${project.episodes[0].document.id}`);
  }

  // Redirect to the first document's editor
  if (project.documents.length > 0) {
    redirect(`/project/${projectId}/script/${project.documents[0].id}`);
  }

  // Fallback — shouldn't happen since we auto-create a document
  redirect(`/dashboard`);
}
