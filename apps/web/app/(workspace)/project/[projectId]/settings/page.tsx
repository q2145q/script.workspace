import { redirect } from "next/navigation";
import { serverApi } from "@/lib/trpc/server";
import { ProjectSettingsForm } from "@/components/workspace/project-settings-form";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const api = await serverApi();

  let project;
  try {
    project = await api.project.getById({ id: projectId });
  } catch {
    redirect("/dashboard");
  }

  // Only owners can access settings
  if (!project) {
    redirect("/dashboard");
  }

  return (
    <div className="h-screen overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <ProjectSettingsForm
          project={{
            id: project.id,
            title: project.title,
            description: project.description,
            type: project.type,
            language: (project as Record<string, unknown>).language as string ?? "en",
            status: (project as Record<string, unknown>).status as string ?? "DRAFT",
            preferredProvider: (project as Record<string, unknown>).preferredProvider as string | null ?? null,
            preferredModel: (project as Record<string, unknown>).preferredModel as string | null ?? null,
            logline: (project as Record<string, unknown>).logline as string | null ?? null,
            synopsis: (project as Record<string, unknown>).synopsis as string | null ?? null,
          }}
          projectId={projectId}
          isOwner={true}
        />
      </div>
    </div>
  );
}
