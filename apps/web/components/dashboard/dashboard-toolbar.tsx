"use client";

import { useTranslations } from "next-intl";
import { Search, ArrowUpDown, LayoutGrid, List, Archive, Trash2 } from "lucide-react";
import type { SortBy, SortDir, ViewMode } from "@/hooks/use-dashboard-filters";

interface DashboardToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  status: string | undefined;
  onStatusChange: (v: string | undefined) => void;
  sortBy: SortBy;
  onSortByChange: (v: SortBy) => void;
  sortDir: SortDir;
  onToggleSortDir: () => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  selectedCount: number;
  onBulkDelete: () => void;
  onBulkArchive: () => void;
}

export function DashboardToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  sortBy,
  onSortByChange,
  sortDir,
  onToggleSortDir,
  viewMode,
  onViewModeChange,
  selectedCount,
  onBulkDelete,
  onBulkArchive,
}: DashboardToolbarProps) {
  const t = useTranslations("Dashboard");
  const tStatus = useTranslations("ProjectStatus");

  const statuses = ["DRAFT", "IN_PROGRESS", "UNDER_REVIEW", "FINAL", "ARCHIVED"] as const;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-lg border border-border bg-muted/50 py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Status filter */}
      <select
        value={status ?? ""}
        onChange={(e) => onStatusChange(e.target.value || undefined)}
        className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">{t("allStatuses")}</option>
        {statuses.map((s) => (
          <option key={s} value={s}>{tStatus(s)}</option>
        ))}
      </select>

      {/* Sort by */}
      <select
        value={sortBy}
        onChange={(e) => onSortByChange(e.target.value as SortBy)}
        className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="updatedAt">{t("sortUpdated")}</option>
        <option value="createdAt">{t("sortCreated")}</option>
        <option value="title">{t("sortTitle")}</option>
      </select>

      {/* Sort direction */}
      <button
        onClick={onToggleSortDir}
        className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={sortDir === "asc" ? "↑" : "↓"}
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        <span className="text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
      </button>

      {/* View toggle */}
      <div className="flex rounded-lg border border-border">
        <button
          onClick={() => onViewModeChange("grid")}
          className={`flex items-center rounded-l-lg px-2.5 py-2 text-sm transition-colors ${
            viewMode === "grid"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className={`flex items-center rounded-r-lg px-2.5 py-2 text-sm transition-colors ${
            viewMode === "list"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <List className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bulk actions */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5">
          <span className="text-xs text-muted-foreground">
            {t("selected", { count: selectedCount })}
          </span>
          <button
            onClick={onBulkArchive}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Archive className="h-3 w-3" />
            {t("archive")}
          </button>
          <button
            onClick={onBulkDelete}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="h-3 w-3" />
            {t("bulkDelete")}
          </button>
        </div>
      )}
    </div>
  );
}
