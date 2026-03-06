"use client";

import { useState, useCallback, useMemo } from "react";

export type SortBy = "updatedAt" | "createdAt" | "title";
export type SortDir = "asc" | "desc";
export type ViewMode = "grid" | "list";

interface DashboardFilters {
  search: string;
  status: string | undefined;
  sortBy: SortBy;
  sortDir: SortDir;
  viewMode: ViewMode;
}

export function useDashboardFilters() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<SortBy>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const toggleSortDir = useCallback(() => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }, []);

  const queryInput = useMemo(
    () => ({
      search: search.trim() || undefined,
      status,
      sortBy,
      sortDir,
    }),
    [search, status, sortBy, sortDir]
  );

  return {
    search,
    setSearch,
    status,
    setStatus,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    toggleSortDir,
    viewMode,
    setViewMode,
    queryInput,
  };
}
