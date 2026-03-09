"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, X, Plus, GripVertical } from "lucide-react";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface ContextPinsPanelProps {
  projectId: string;
}

export function ContextPinsPanel({ projectId }: ContextPinsPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPinContent, setNewPinContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const t = useTranslations("ContextPins");
  const tCommon = useTranslations("Common");

  const queryKey = trpc.pin.list.queryKey({ projectId });

  const { data: pins = [], isLoading } = useQuery(
    trpc.pin.list.queryOptions({ projectId })
  );

  const createMutation = useMutation(
    trpc.pin.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey });
        setNewPinContent("");
        setIsAdding(false);
        toast.success(t("pinAdded"));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const deleteMutation = useMutation(
    trpc.pin.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey });
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const reorderMutation = useMutation(
    trpc.pin.reorder.mutationOptions({
      onError: (err) => toast.error(err.message),
    })
  );

  const handleAddPin = () => {
    const content = newPinContent.trim();
    if (!content) return;
    createMutation.mutate({
      projectId,
      content,
      type: "CUSTOM",
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  // Drag and drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const newPins = [...pins];
    const [moved] = newPins.splice(dragIndex, 1);
    newPins.splice(index, 0, moved);

    // Optimistic reorder in UI
    queryClient.setQueryData(queryKey, newPins);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null) {
      const currentPins = queryClient.getQueryData(queryKey) as typeof pins;
      if (currentPins) {
        reorderMutation.mutate({
          projectId,
          pinIds: currentPins.map((p) => p.id),
        });
      }
    }
    setDragIndex(null);
  };

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      TEXT: "bg-blue-500/10 text-blue-500",
      COMMENT: "bg-amber-500/10 text-amber-500",
      CUSTOM: "bg-purple-500/10 text-purple-500",
    };
    return (
      <span
        className={`rounded px-1 py-0.5 text-[8px] font-medium uppercase ${colors[type] || "bg-muted text-muted-foreground"}`}
      >
        {type}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-cinema border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("title")}
          </span>
          {pins.length > 0 && (
            <span className="rounded-full bg-cinema/10 px-1.5 py-0.5 text-[9px] font-medium text-cinema">
              {pins.length}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setIsAdding(true);
            setTimeout(() => textareaRef.current?.focus(), 50);
          }}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={t("addCustom")}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {/* Pins list */}
      <div className="flex-1 overflow-y-auto">
        {pins.length === 0 && !isAdding && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <Pin className="h-6 w-6 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              {t("emptyState")}
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              {t("emptyHint")}
            </p>
          </div>
        )}

        <div className="space-y-1 p-2">
          <AnimatePresence>
            {pins.map((pin, index) => (
              <motion.div
                key={pin.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`pin-card group flex cursor-grab items-start gap-2 p-2 ${
                  dragIndex === index ? "opacity-50" : ""
                }`}
              >
                <GripVertical className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {typeBadge(pin.type)}
                    {pin.label && (
                      <span className="truncate text-[10px] font-medium text-foreground">
                        {pin.label}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-3 text-[11px] text-muted-foreground">
                    {pin.content}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(pin.id)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground/30 transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add custom pin form */}
          <AnimatePresence>
            {isAdding && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-md border border-cinema/30 p-2">
                  <textarea
                    ref={textareaRef}
                    value={newPinContent}
                    onChange={(e) => setNewPinContent(e.target.value)}
                    placeholder={t("placeholder")}
                    rows={3}
                    className="w-full resize-none rounded border-none bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <div className="mt-1 flex justify-end gap-1">
                    <button
                      onClick={() => {
                        setIsAdding(false);
                        setNewPinContent("");
                      }}
                      className="rounded px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent"
                    >
                      {tCommon("cancel")}
                    </button>
                    <button
                      onClick={handleAddPin}
                      disabled={!newPinContent.trim() || createMutation.isPending}
                      className="rounded bg-cinema/10 px-2 py-1 text-[10px] font-medium text-cinema hover:bg-cinema/20 disabled:opacity-30"
                    >
                      {tCommon("add")}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer hint */}
      {pins.length > 0 && (
        <div className="border-t border-border p-2 text-center text-[9px] text-muted-foreground/50">
          {t("footerHint")}
        </div>
      )}
    </div>
  );
}
