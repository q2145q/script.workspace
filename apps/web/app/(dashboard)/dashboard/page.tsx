"use client";

import { useTRPC } from "@/lib/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ProjectList } from "@/components/dashboard/project-list";
import { CreateProjectDialog } from "@/components/dashboard/create-project-dialog";

export default function DashboardPage() {
  const trpc = useTRPC();
  const t = useTranslations("Dashboard");
  const { data: projects, isLoading } = useQuery(
    trpc.project.list.queryOptions()
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("projects")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("projectsSubtitle")}
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-shimmer rounded-xl border border-border"
            />
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <ProjectList projects={projects} />
      ) : (
        <div className="flex h-60 flex-col items-center justify-center rounded-xl border border-dashed border-border">
          <p className="mb-2 text-muted-foreground">{t("noProjects")}</p>
          <p className="text-sm text-muted-foreground">
            {t("createFirst")}
          </p>
        </div>
      )}
    </motion.div>
  );
}
