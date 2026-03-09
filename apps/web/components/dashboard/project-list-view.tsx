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

interface ProjectListViewProps {
  projects: Project[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const item = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0 },
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function ProjectListView({ projects, selectedIds, onToggleSelect }: ProjectListViewProps) {
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
      onError: (err) => toast.error(err.message),
    })
  );

  return (
    <motion.div
      className="overflow-hidden rounded-xl border border-border"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="w-10 px-3 py-2.5">
              {/* select all checkbox placeholder */}
            </th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
              {t("projectTitle")}
            </th>
            <th className="hidden px-3 py-2.5 text-left font-medium text-muted-foreground md:table-cell">
              {t("projectType")}
            </th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
              {t("statusColumn")}
            </th>
            <th className="hidden px-3 py-2.5 text-center font-medium text-muted-foreground sm:table-cell">
              {t("docsColumn")}
            </th>
            <th className="hidden px-3 py-2.5 text-left font-medium text-muted-foreground lg:table-cell">
              {t("updatedColumn")}
            </th>
            <th className="w-16 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <motion.tr
              key={project.id}
              variants={item}
              className="group border-b border-border/50 transition-colors hover:bg-muted/20"
            >
              <td className="px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={selectedIds.has(project.id)}
                  onChange={() => onToggleSelect(project.id)}
                  className="h-3.5 w-3.5 rounded border-border"
                />
              </td>
              <td className="px-3 py-2.5">
                <Link
                  href={`/project/${project.id}`}
                  className="font-medium text-foreground hover:text-cinema transition-colors"
                >
                  {project.title}
                </Link>
                {project.description && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground max-w-[300px]">
                    {project.description}
                  </p>
                )}
              </td>
              <td className="hidden px-3 py-2.5 text-muted-foreground md:table-cell">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                  {tTypes(project.type as string)}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PROJECT_STATUS_COLORS[project.status as ProjectStatus] ?? "bg-zinc-500/20 text-zinc-400"}`}>
                  {tStatus(project.status as ProjectStatus)}
                </span>
              </td>
              <td className="hidden px-3 py-2.5 text-center text-muted-foreground sm:table-cell">
                {project._count.documents}
              </td>
              <td className="hidden px-3 py-2.5 text-xs text-muted-foreground lg:table-cell">
                {formatDate(project.updatedAt)}
              </td>
              <td className="px-3 py-2.5">
                <button
                  onClick={() => {
                    if (confirm(t("deleteProject"))) {
                      deleteMutation.mutate({ id: project.id });
                    }
                  }}
                  className="text-xs text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:text-destructive"
                >
                  {tCommon("delete")}
                </button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}
