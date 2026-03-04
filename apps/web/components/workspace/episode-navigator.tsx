"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Tv, GripVertical, Trash2 } from "lucide-react";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface EpisodeNavigatorProps {
  projectId: string;
  activeDocumentId: string;
}

export function EpisodeNavigator({ projectId, activeDocumentId }: EpisodeNavigatorProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const episodesQuery = useQuery(
    trpc.episode.list.queryOptions({ projectId })
  );

  const createMutation = useMutation(
    trpc.episode.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.episode.list.queryKey({ projectId }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.project.getById.queryKey({ id: projectId }),
        });
        setNewTitle("");
        setShowCreate(false);
        toast.success("Episode created");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const updateMutation = useMutation(
    trpc.episode.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.episode.list.queryKey({ projectId }),
        });
        setEditingId(null);
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const deleteMutation = useMutation(
    trpc.episode.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.episode.list.queryKey({ projectId }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.project.getById.queryKey({ id: projectId }),
        });
        toast.success("Episode deleted");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({ projectId, title: newTitle.trim() });
  };

  const handleRename = (id: string) => {
    if (!editTitle.trim()) return;
    updateMutation.mutate({ id, title: editTitle.trim() });
  };

  const episodes = episodesQuery.data ?? [];

  return (
    <div className="border-t border-sidebar-border py-2">
      <div className="flex items-center justify-between px-3 py-1">
        <div className="flex items-center gap-1.5">
          <Tv className="h-3 w-3 text-muted-foreground" />
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Episodes
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-2"
          >
            <div className="flex gap-1 py-1">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Episode title"
                className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ai-accent"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setShowCreate(false);
                }}
                autoFocus
              />
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending || !newTitle.trim()}
                className="rounded bg-ai-accent px-2 py-1 text-[10px] font-medium text-white hover:bg-ai-accent/80 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Episodes list */}
      <div className="mt-0.5 space-y-0.5 px-2">
        {episodes.map((ep) => (
          <div key={ep.id} className="group flex items-center gap-1">
            <GripVertical className="h-3 w-3 flex-shrink-0 text-muted-foreground/30 opacity-0 group-hover:opacity-100" />

            {editingId === ep.id ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(ep.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                onBlur={() => handleRename(ep.id)}
                className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ai-accent"
                autoFocus
              />
            ) : (
              <Link
                href={`/project/${projectId}/script/${ep.document.id}`}
                onDoubleClick={() => {
                  setEditingId(ep.id);
                  setEditTitle(ep.title);
                }}
                className={`flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-all duration-200 ${
                  ep.document.id === activeDocumentId
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <span className="flex-shrink-0 rounded bg-muted px-1 py-0.5 text-[9px] font-mono font-medium">
                  E{ep.number}
                </span>
                <span className="truncate">{ep.title}</span>
              </Link>
            )}

            <button
              onClick={() => deleteMutation.mutate({ id: ep.id })}
              className="flex-shrink-0 rounded p-0.5 text-muted-foreground/40 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {episodes.length === 0 && !showCreate && (
        <p className="px-3 py-2 text-[10px] text-muted-foreground/50">
          No episodes yet
        </p>
      )}
    </div>
  );
}
