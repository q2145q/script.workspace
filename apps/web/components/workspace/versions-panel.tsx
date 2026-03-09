"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Plus, RotateCcw, Eye, GitCompare, X } from "lucide-react";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface VersionsPanelProps {
  documentId: string;
}

// Extract plain text from TipTap JSONContent
function extractText(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const doc = content as { type?: string; content?: unknown[]; text?: string };
  if (doc.text) return doc.text;
  if (!doc.content || !Array.isArray(doc.content)) return "";

  return doc.content
    .map((node) => {
      const n = node as { type?: string; content?: unknown[]; text?: string };
      const nodeType = n.type || "";
      const text = extractText(n);
      if (!text) return "";

      // Format based on screenplay node type
      switch (nodeType) {
        case "sceneHeading":
          return text.toUpperCase();
        case "character":
          return `\t\t\t${text.toUpperCase()}`;
        case "dialogue":
          return `\t\t${text}`;
        case "parenthetical":
          return `\t\t${text}`;
        case "transition":
          return `\t\t\t\t\t${text.toUpperCase()}`;
        default:
          return text;
      }
    })
    .filter(Boolean)
    .join("\n");
}

// Simple line-by-line diff algorithm (no external deps)
interface DiffLine {
  type: "same" | "added" | "removed";
  text: string;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: DiffLine[] = [];

  // Simple LCS-based diff
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce diff
  let i = m, j = n;
  const stack: DiffLine[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      stack.push({ type: "same", text: oldLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: "added", text: newLines[j - 1] });
      j--;
    } else {
      stack.push({ type: "removed", text: oldLines[i - 1] });
      i--;
    }
  }

  stack.reverse();
  return stack;
}

export function VersionsPanel({ documentId }: VersionsPanelProps) {
  const t = useTranslations("Versions");
  const tc = useTranslations("Common");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [draftName, setDraftName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [diffMode, setDiffMode] = useState(false);
  const [diffFromId, setDiffFromId] = useState<string | null>(null);
  const [diffToId, setDiffToId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"drafts" | "revisions">("drafts");

  const draftsQuery = useQuery(
    trpc.draft.list.queryOptions({ documentId })
  );

  const revisionsQuery = useQuery(
    trpc.revision.list.queryOptions({ documentId })
  );

  const revisionPreviewQuery = useQuery(
    trpc.revision.getById.queryOptions(
      { id: previewId! },
      { enabled: !!previewId && activeTab === "revisions" && !diffMode }
    )
  );

  const restoreRevisionMutation = useMutation(
    trpc.revision.restore.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.revision.list.queryKey({ documentId }),
        });
        toast.success(t("draftRestored"));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const createRevisionMutation = useMutation(
    trpc.revision.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.revision.list.queryKey({ documentId }),
        });
        toast.success(t("revisionCreated"));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const previewQuery = useQuery(
    trpc.draft.getById.queryOptions(
      { id: previewId! },
      { enabled: !!previewId && !diffMode }
    )
  );

  const diffFromQuery = useQuery(
    trpc.draft.getById.queryOptions(
      { id: diffFromId! },
      { enabled: !!diffFromId && diffMode }
    )
  );

  const diffToQuery = useQuery(
    trpc.draft.getById.queryOptions(
      { id: diffToId! },
      { enabled: !!diffToId && diffMode }
    )
  );

  const createMutation = useMutation(
    trpc.draft.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.draft.list.queryKey({ documentId }),
        });
        setDraftName("");
        setShowCreate(false);
        toast.success(t("draftSaved"));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const restoreMutation = useMutation(
    trpc.draft.restore.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.draft.list.queryKey({ documentId }),
        });
        toast.success(t("draftRestored"));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const handleCreate = () => {
    createMutation.mutate({
      documentId,
      name: draftName.trim() || undefined,
    });
  };

  const diffResult = useMemo(() => {
    if (!diffFromQuery.data?.content || !diffToQuery.data?.content) return null;
    const oldText = extractText(diffFromQuery.data.content);
    const newText = extractText(diffToQuery.data.content);
    return computeDiff(oldText, newText);
  }, [diffFromQuery.data, diffToQuery.data]);

  const drafts = draftsQuery.data ?? [];

  const handleDraftClick = (draftId: string) => {
    if (diffMode) {
      if (!diffFromId) {
        setDiffFromId(draftId);
      } else if (!diffToId) {
        setDiffToId(draftId);
      } else {
        // Reset and start over
        setDiffFromId(draftId);
        setDiffToId(null);
      }
    } else {
      setPreviewId(previewId === draftId ? null : draftId);
    }
  };

  const getDraftBorder = (draftId: string) => {
    if (diffMode) {
      if (draftId === diffFromId) return "border-red-400/50 bg-red-500/5";
      if (draftId === diffToId) return "border-emerald-400/50 bg-emerald-500/5";
    }
    if (previewId === draftId) return "border-cinema/50 bg-cinema/5";
    return "border-transparent hover:bg-accent";
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="glass-panel flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t("title")}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setDiffMode(!diffMode);
              setDiffFromId(null);
              setDiffToId(null);
              setPreviewId(null);
            }}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              diffMode
                ? "bg-cinema/10 text-cinema"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <GitCompare className="h-3 w-3" />
            {t("diff")}
          </button>
          <button
            onClick={() => {
              if (activeTab === "drafts") {
                setShowCreate(!showCreate);
              } else {
                createRevisionMutation.mutate({ documentId });
              }
            }}
            disabled={activeTab === "revisions" && createRevisionMutation.isPending}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
            {tc("save")}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => { setActiveTab("drafts"); setPreviewId(null); }}
          className={`flex-1 py-1.5 text-center text-xs font-medium transition-colors ${
            activeTab === "drafts"
              ? "border-b-2 border-cinema text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("draftsTab")} ({drafts.length})
        </button>
        <button
          onClick={() => { setActiveTab("revisions"); setPreviewId(null); }}
          className={`flex-1 py-1.5 text-center text-xs font-medium transition-colors ${
            activeTab === "revisions"
              ? "border-b-2 border-cinema text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("revisionsTab")} ({revisionsQuery.data?.items.length ?? 0})
        </button>
      </div>

      {/* Diff mode instruction */}
      {diffMode && (
        <div className="border-b border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
          {!diffFromId
            ? t("selectOlder")
            : !diffToId
            ? t("selectNewer")
            : t("showingDiff")}
        </div>
      )}

      {/* Create draft form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border"
          >
            <div className="flex gap-2 p-3">
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder={t("draftNamePlaceholder")}
                className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cinema"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="rounded-md bg-cinema px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-cinema/80 disabled:opacity-50"
              >
                {tc("save")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drafts list */}
      <div className={`overflow-y-auto ${diffResult || previewId ? "h-[40%] shrink-0" : "flex-1"}`} style={{ display: activeTab === "drafts" ? undefined : "none" }}>
        {draftsQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <History className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">{t("noDrafts")}</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              {t("noDraftsHint")}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {drafts.map((draft, i) => (
              <motion.div
                key={draft.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`group cursor-pointer rounded-md border px-3 py-2.5 transition-colors ${getDraftBorder(draft.id)}`}
                onClick={() => handleDraftClick(draft.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {draft.name || t("draftFallback", { number: draft.number })}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      #{draft.number} &middot;{" "}
                      {new Date(draft.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {!diffMode && (
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewId(previewId === draft.id ? null : draft.id);
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title={tc("preview")}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(t("restoreConfirm"))) {
                            restoreMutation.mutate({ id: draft.id });
                          }
                        }}
                        disabled={restoreMutation.isPending}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title={t("restoreTitle")}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Revisions list */}
      <div className={`overflow-y-auto ${previewId ? "h-[40%] shrink-0" : "flex-1"}`} style={{ display: activeTab === "revisions" ? undefined : "none" }}>
        {revisionsQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : !revisionsQuery.data?.items.length ? (
          <div className="px-4 py-8 text-center">
            <History className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">{t("noRevisions")}</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              {t("noRevisionsHint")}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {revisionsQuery.data.items.map((rev, i) => (
              <motion.div
                key={rev.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`group cursor-pointer rounded-md border px-3 py-2.5 transition-colors ${
                  previewId === rev.id
                    ? "border-cinema/50 bg-cinema/5"
                    : "border-transparent hover:bg-accent"
                }`}
                onClick={() => setPreviewId(previewId === rev.id ? null : rev.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {rev.summary || t("revisionFallback", { number: rev.number })}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      #{rev.number}
                      {rev.wordCount ? ` · ${rev.wordCount} ${t("words")}` : ""}
                      {" · "}
                      {new Date(rev.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(t("restoreConfirm"))) {
                          restoreRevisionMutation.mutate({ id: rev.id });
                        }
                      }}
                      disabled={restoreRevisionMutation.isPending}
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      title={t("restoreTitle")}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Revision preview pane */}
      <AnimatePresence>
        {activeTab === "revisions" && previewId && revisionPreviewQuery.data && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "60%", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-col overflow-hidden border-t border-border"
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                {revisionPreviewQuery.data.summary || t("revisionFallback", { number: revisionPreviewQuery.data.number })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (confirm(t("restoreConfirm"))) {
                      restoreRevisionMutation.mutate({ id: previewId! });
                    }
                  }}
                  disabled={restoreRevisionMutation.isPending}
                  className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-cinema hover:bg-cinema/10"
                >
                  <RotateCcw className="h-3 w-3" />
                  {tc("restore")}
                </button>
                <button
                  onClick={() => setPreviewId(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground leading-relaxed">
                {extractText(revisionPreviewQuery.data.content)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Diff view */}
      {diffMode && diffResult && (
        <div className="flex flex-1 flex-col overflow-hidden border-t border-border">
          <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
            <span className="text-xs text-muted-foreground">
              <span className="text-red-400">{diffFromQuery.data?.name || t("draftFallback", { number: diffFromQuery.data?.number ?? 0 })}</span>
              {" → "}
              <span className="text-emerald-400">{diffToQuery.data?.name || t("draftFallback", { number: diffToQuery.data?.number ?? 0 })}</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                <span className="text-red-400">-{diffResult.filter((l) => l.type === "removed").length}</span>
                {" / "}
                <span className="text-emerald-400">+{diffResult.filter((l) => l.type === "added").length}</span>
              </span>
              <button
                onClick={() => { setDiffFromId(null); setDiffToId(null); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
            {diffResult.map((line, i) => (
              <div
                key={i}
                className={`whitespace-pre-wrap px-2 py-0.5 ${
                  line.type === "removed"
                    ? "bg-red-500/10 text-red-400"
                    : line.type === "added"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-muted-foreground"
                }`}
              >
                <span className="mr-2 inline-block w-3 select-none text-right opacity-50">
                  {line.type === "removed" ? "-" : line.type === "added" ? "+" : " "}
                </span>
                {line.text || " "}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview pane (non-diff mode) */}
      <AnimatePresence>
        {!diffMode && previewId && previewQuery.data && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "60%", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-col overflow-hidden border-t border-border"
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                {previewQuery.data.name || t("draftFallback", { number: previewQuery.data.number })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (confirm(t("restoreConfirm"))) {
                      restoreMutation.mutate({ id: previewId! });
                    }
                  }}
                  disabled={restoreMutation.isPending}
                  className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-cinema hover:bg-cinema/10"
                >
                  <RotateCcw className="h-3 w-3" />
                  {tc("restore")}
                </button>
                <button
                  onClick={() => setPreviewId(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground leading-relaxed">
                {extractText(previewQuery.data.content)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
