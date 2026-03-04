"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Plus, RotateCcw, Eye } from "lucide-react";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface VersionsPanelProps {
  documentId: string;
}

export function VersionsPanel({ documentId }: VersionsPanelProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [draftName, setDraftName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const draftsQuery = useQuery(
    trpc.draft.list.queryOptions({ documentId })
  );

  const previewQuery = useQuery(
    trpc.draft.getById.queryOptions(
      { id: previewId! },
      { enabled: !!previewId }
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
        toast.success("Draft saved");
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
        toast.success("Draft restored. Reload the page to see changes.");
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

  const drafts = draftsQuery.data ?? [];

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="glass-panel flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Versions</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {drafts.length}
          </span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Save Draft
        </button>
      </div>

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
                placeholder="Draft name (optional)"
                className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ai-accent"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="rounded-md bg-ai-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-ai-accent/80 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drafts list */}
      <div className="flex-1 overflow-y-auto">
        {draftsQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <History className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">No drafts yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Save a draft to create a snapshot of your current document.
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
                className={`group rounded-md border px-3 py-2.5 transition-colors ${
                  previewId === draft.id
                    ? "border-ai-accent/50 bg-ai-accent/5"
                    : "border-transparent hover:bg-accent"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {draft.name || `Draft ${draft.number}`}
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
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() =>
                        setPreviewId(previewId === draft.id ? null : draft.id)
                      }
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Preview"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => restoreMutation.mutate({ id: draft.id })}
                      disabled={restoreMutation.isPending}
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Restore this draft"
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

      {/* Preview pane */}
      <AnimatePresence>
        {previewId && previewQuery.data && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "40%", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                Preview: {previewQuery.data.name || `Draft ${previewQuery.data.number}`}
              </span>
              <button
                onClick={() => setPreviewId(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <div className="h-full overflow-y-auto p-3">
              <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                {JSON.stringify(previewQuery.data.content, null, 2).slice(0, 2000)}
                {JSON.stringify(previewQuery.data.content).length > 2000 && "\n..."}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
