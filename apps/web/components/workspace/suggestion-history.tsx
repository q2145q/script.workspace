"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Undo2, Clock } from "lucide-react";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery } from "@tanstack/react-query";

type StatusFilter = "ALL" | "APPLIED" | "REJECTED" | "UNDONE";

interface SuggestionHistoryProps {
  documentId: string;
}

function computeNewText(operations: unknown): string {
  const ops = operations as Array<{ type: string; content?: string }>;
  return ops
    .filter((op) => op.type === "replace" || op.type === "insert")
    .map((op) => op.content ?? "")
    .join("");
}

function relativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Check }> = {
  APPLIED: { label: "Applied", color: "text-green-500", icon: Check },
  REJECTED: { label: "Dismissed", color: "text-red-400", icon: X },
  UNDONE: { label: "Undone", color: "text-muted-foreground", icon: Undo2 },
};

export function SuggestionHistory({ documentId }: SuggestionHistoryProps) {
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const trpc = useTRPC();

  const { data: suggestions, isLoading } = useQuery(
    trpc.suggestion.list.queryOptions({ documentId })
  );

  // Filter out PENDING (shown in SuggestionPreview) and apply status filter
  const filtered = (suggestions ?? []).filter((s) => {
    if (s.status === "PENDING") return false;
    if (filter !== "ALL" && s.status !== filter) return false;
    return true;
  });

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "ALL", label: "All" },
    { id: "APPLIED", label: "Applied" },
    { id: "REJECTED", label: "Dismissed" },
    { id: "UNDONE", label: "Undone" },
  ];

  if (isLoading) {
    return (
      <div className="p-3">
        <div className="h-4 w-24 animate-shimmer rounded bg-muted/50" />
      </div>
    );
  }

  // Don't render anything if there's no history at all
  const hasAnyHistory = (suggestions ?? []).some((s) => s.status !== "PENDING");
  if (!hasAnyHistory) return null;

  return (
    <div className="border-t border-border">
      {/* Header + filter pills */}
      <div className="px-3 pt-3 pb-1">
        <div className="mb-2 flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            History
          </span>
        </div>

        <div className="flex gap-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-all duration-200 ${
                filter === f.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* History list */}
      <div className="max-h-64 overflow-y-auto px-3 pb-3 pt-1">
        {filtered.length === 0 ? (
          <p className="py-2 text-center text-[10px] text-muted-foreground">
            No {filter === "ALL" ? "" : filter.toLowerCase() + " "}suggestions yet
          </p>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-1.5">
              {filtered.map((s) => {
                const config = STATUS_CONFIG[s.status];
                if (!config) return null;
                const StatusIcon = config.icon;
                const newText = computeNewText(s.operations);

                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-lg border border-border/50 bg-muted/20 p-2"
                  >
                    {/* Status + time row */}
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <StatusIcon className={`h-3 w-3 ${config.color}`} />
                        <span className={`text-[9px] font-medium ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">
                        {relativeTime(s.createdAt)}
                      </span>
                    </div>

                    {/* Instruction */}
                    <p className="mb-1 text-[10px] text-foreground/80">
                      &ldquo;{s.instruction}&rdquo;
                    </p>

                    {/* Diff preview */}
                    <div className="space-y-0.5 rounded border border-border/30 bg-background/50 p-1.5">
                      <p className="text-[9px] leading-snug">
                        <span className="mr-1 text-suggestion-remove-border">−</span>
                        <span className="text-muted-foreground line-through">
                          {s.selectedText.length > 120
                            ? s.selectedText.slice(0, 120) + "..."
                            : s.selectedText}
                        </span>
                      </p>
                      <p className="text-[9px] leading-snug">
                        <span className="mr-1 text-suggestion-add-border">+</span>
                        <span className="text-foreground/70">
                          {newText.length > 120
                            ? newText.slice(0, 120) + "..."
                            : newText}
                        </span>
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
