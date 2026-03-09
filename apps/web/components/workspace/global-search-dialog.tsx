"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Search, FileText, X, Loader2 } from "lucide-react";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery } from "@tanstack/react-query";

interface GlobalSearchDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export function GlobalSearchDialog({ open, onClose, projectId }: GlobalSearchDialogProps) {
  const t = useTranslations("GlobalSearch");
  const router = useRouter();
  const trpc = useTRPC();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setDebouncedQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const { data: results, isLoading } = useQuery({
    ...trpc.search.documents.queryOptions({
      query: debouncedQuery,
      projectId,
    }),
    enabled: debouncedQuery.length > 0,
  });

  const handleSelect = useCallback(
    (docId: string, docProjectId: string) => {
      router.push(`/project/${docProjectId}/script/${docId}`);
      onClose();
    },
    [router, onClose]
  );

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="glass-panel relative z-10 w-full max-w-lg rounded-xl border border-border shadow-2xl"
        >
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("placeholder")}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <button
              onClick={onClose}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[40vh] overflow-y-auto p-2">
            {debouncedQuery && results && results.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                {t("noResults")}
              </p>
            )}

            {results && results.length > 0 && (
              <div className="space-y-0.5">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result.id, result.projectId)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {result.title}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {result.projectTitle}
                        {result.matchType === "content" && (
                          <span className="ml-1 text-cinema">
                            · {t("contentMatch")}
                          </span>
                        )}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!debouncedQuery && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                {t("hint")}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
            {t("shortcut")}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
