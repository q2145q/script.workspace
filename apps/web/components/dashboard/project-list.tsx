"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
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
    <motion.div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {projects.map((project) => (
        <motion.div
          key={project.id}
          variants={item}
          className="group relative rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-ai-accent/30 hover:shadow-md hover:shadow-ai-glow"
        >
          <Link
            href={`/project/${project.id}`}
            className="absolute inset-0 z-10"
          />

          <div className="mb-3 flex items-start justify-between">
            <h3 className="font-medium text-foreground">{project.title}</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
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
              className="relative z-20 text-muted-foreground transition-colors duration-200 hover:text-destructive"
            >
              Delete
            </button>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
