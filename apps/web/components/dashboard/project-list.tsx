"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PROJECT_STATUS_COLORS, type ProjectStatus } from "@script/types";

interface Project {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  updatedAt: Date;
  _count: { documents: number };
}

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

interface ProjectListProps {
  projects: Project[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export function ProjectList({ projects, selectedIds, onToggleSelect }: ProjectListProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const t = useTranslations("Dashboard");
  const tTypes = useTranslations("ProjectTypes");
  const tStatus = useTranslations("ProjectStatus");
  const tCommon = useTranslations("Common");

  const deleteMutation = useMutation(
    trpc.project.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.project.list.queryKey() });
        toast.success(t("projectDeleted"));
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
          className={`group relative rounded-xl border bg-card p-5 transition-all duration-200 hover:border-ai-accent/30 hover:shadow-md hover:shadow-ai-glow ${
            selectedIds.has(project.id)
              ? "border-ai-accent ring-1 ring-ai-accent/30"
              : "border-border"
          }`}
        >
          <Link
            href={`/project/${project.id}`}
            className="absolute inset-0 z-10"
          />

          {/* Checkbox */}
          <div className="absolute left-3 top-3 z-20">
            <input
              type="checkbox"
              checked={selectedIds.has(project.id)}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect(project.id);
              }}
              className="h-3.5 w-3.5 rounded border-border opacity-0 transition-opacity group-hover:opacity-100 data-[state=checked]:opacity-100"
              style={{ opacity: selectedIds.has(project.id) ? 1 : undefined }}
            />
          </div>

          <div className="mb-3 flex items-start justify-between">
            <h3 className="font-medium text-foreground">{project.title}</h3>
            <div className="flex items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PROJECT_STATUS_COLORS[project.status as ProjectStatus] ?? "bg-zinc-500/20 text-zinc-400"}`}>
                {tStatus(project.status as ProjectStatus)}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {tTypes(project.type as string)}
              </span>
            </div>
          </div>

          {project.description && (
            <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
              {project.description}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t("document", { count: project._count.documents })}
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm(t("deleteProject"))) {
                  deleteMutation.mutate({ id: project.id });
                }
              }}
              className="relative z-20 text-muted-foreground transition-colors duration-200 hover:text-destructive"
            >
              {tCommon("delete")}
            </button>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
