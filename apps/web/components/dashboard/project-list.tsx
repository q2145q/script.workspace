"use client";

import Link from "next/link";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Project {
  id: string;
  title: string;
  description: string | null;
  type: string;
  updatedAt: Date;
  _count: { documents: number };
}

const typeLabels: Record<string, string> = {
  FEATURE_FILM: "Feature Film",
  TV_SERIES: "TV Series",
  SHORT_FILM: "Short Film",
  OTHER: "Other",
};

export function ProjectList({ projects }: { projects: Project[] }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation(
    trpc.project.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.project.list.queryKey() });
        toast.success("Project deleted");
      },
      onError: (err) => {
        toast.error(err.message);
      },
    })
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <div
          key={project.id}
          className="group relative rounded-lg border border-border bg-card p-5 transition-colors hover:border-foreground/20"
        >
          <Link
            href={`/project/${project.id}`}
            className="absolute inset-0 z-10"
          />

          <div className="mb-3 flex items-start justify-between">
            <h3 className="font-medium">{project.title}</h3>
            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {typeLabels[project.type] ?? project.type}
            </span>
          </div>

          {project.description && (
            <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
              {project.description}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {project._count.documents}{" "}
              {project._count.documents === 1 ? "document" : "documents"}
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm("Delete this project?")) {
                  deleteMutation.mutate({ id: project.id });
                }
              }}
              className="relative z-20 text-muted-foreground hover:text-destructive"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
