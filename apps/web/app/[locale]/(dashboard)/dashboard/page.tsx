"use client";

import { useState, useCallback } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ProjectList } from "@/components/dashboard/project-list";
import { ProjectListView } from "@/components/dashboard/project-list-view";
import { CreateProjectDialog } from "@/components/dashboard/create-project-dialog";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import { TutorialBanner } from "@/components/tutorial";

export default function DashboardPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const t = useTranslations("Dashboard");
  const filters = useDashboardFilters();

  const { data: projectsData, isLoading } = useQuery(
    trpc.project.list.queryOptions(filters.queryInput)
  );
  const projects = projectsData?.items;

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Bulk mutations
  const bulkDeleteMutation = useMutation(
    trpc.project.bulkDelete.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: trpc.project.list.queryKey() });
        toast.success(t("bulkDeleted", { count: data.count }));
        setSelectedIds(new Set());
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const bulkArchiveMutation = useMutation(
    trpc.project.bulkArchive.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: trpc.project.list.queryKey() });
        toast.success(t("bulkArchived", { count: data.count }));
        setSelectedIds(new Set());
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(t("confirmBulkDelete", { count: selectedIds.size }))) {
      bulkDeleteMutation.mutate({ ids: Array.from(selectedIds) });
    }
  };

  const handleBulkArchive = () => {
    if (selectedIds.size === 0) return;
    bulkArchiveMutation.mutate({ ids: Array.from(selectedIds) });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <TutorialBanner />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("projects")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("projectsSubtitle")}
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      <DashboardToolbar
        search={filters.search}
        onSearchChange={filters.setSearch}
        status={filters.status}
        onStatusChange={filters.setStatus}
        sortBy={filters.sortBy}
        onSortByChange={filters.setSortBy}
        sortDir={filters.sortDir}
        onToggleSortDir={filters.toggleSortDir}
        viewMode={filters.viewMode}
        onViewModeChange={filters.setViewMode}
        selectedCount={selectedIds.size}
        onBulkDelete={handleBulkDelete}
        onBulkArchive={handleBulkArchive}
      />

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
        /* TODO: load more via nextCursor when needed */
        filters.viewMode === "grid" ? (
          <ProjectList
            projects={projects}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        ) : (
          <ProjectListView
            projects={projects}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        )
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
