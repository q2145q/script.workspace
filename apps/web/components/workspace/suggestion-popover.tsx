"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, RefreshCw, Loader2, Undo2, Sparkles } from "lucide-react";
import type { Editor } from "@script/editor";
import { Fragment } from "@script/editor";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface SuggestionPopoverProps {
  editor: Editor | null;
  documentId: string;
}

/** Detect if stored operations are blocks format (new) vs legacy */
function isBlocksFormat(
  data: unknown
): data is Array<{ type: string; text: string }> {
  if (!Array.isArray(data) || data.length === 0) return false;
  const first = data[0];
  return (
    typeof first === "object" &&
    first !== null &&
    "text" in first &&
    "type" in first &&
    !("from" in first)
  );
}

type SuggestionRecord = {
  id: string;
  instruction: string;
  explanation: string | null;
  operations: unknown;
  selectedText: string;
  selectionFrom: number;
  selectionTo: number;
  status: string;
  createdAt: Date;
  createdBy: { id: string; name: string; image: string | null };
};

export function SuggestionPopover({
  editor,
  documentId,
}: SuggestionPopoverProps) {
  const t = useTranslations("Suggestions");
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(
    null
  );
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [recentlyApplied, setRecentlyApplied] = useState<Set<string>>(
    new Set()
  );
  const popoverRef = useRef<HTMLDivElement>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: pendingSuggestions } = useQuery(
    trpc.suggestion.pending.queryOptions({ documentId })
  );

  // Auto-open popover when a suggestion is created (via custom event)
  useEffect(() => {
    if (!editor) return;

    const handler = (e: Event) => {
      const { id, to } = (e as CustomEvent).detail as {
        id: string;
        from: number;
        to: number;
      };

      // Trigger refetch so suggestion data is available for rendering
      invalidate();

      // Wait for ProseMirror decoration to render in DOM
      setTimeout(() => {
        const el = document.querySelector(
          `[data-suggestion-id="${id}"]`
        ) as HTMLElement | null;

        if (el) {
          const rect = el.getBoundingClientRect();
          setActiveSuggestionId(id);
          setPosition({ top: rect.bottom + 6, left: rect.left });
        } else {
          // Fallback: use ProseMirror coords
          try {
            const coords = editor.view.coordsAtPos(to);
            setActiveSuggestionId(id);
            setPosition({ top: coords.bottom + 6, left: coords.left });
          } catch {
            // Position not available, skip auto-open
          }
        }
      }, 200);
    };

    window.addEventListener("suggestion-created", handler);
    return () => window.removeEventListener("suggestion-created", handler);
  }, [editor]);

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: trpc.suggestion.pending.queryKey({ documentId }),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.suggestion.list.queryKey({ documentId }),
    });
  };

  const applyMutation = useMutation(
    trpc.suggestion.accept.mutationOptions({
      onSuccess: invalidate,
      onError: (err) => toast.error(t("failedApply", { message: err.message })),
    })
  );

  const rejectMutation = useMutation(
    trpc.suggestion.reject.mutationOptions({
      onSuccess: invalidate,
      onError: (err) => toast.error(t("failedDismiss", { message: err.message })),
    })
  );

  const undoMutation = useMutation(
    trpc.suggestion.undo.mutationOptions({
      onSuccess: invalidate,
      onError: (err) => toast.error(t("failedUndo", { message: err.message })),
    })
  );

  const rewriteMutation = useMutation(
    trpc.ai.rewrite.mutationOptions({
      onSuccess: (result) => {
        if (!editor) return;

        const newText = result.blocks.map((b) => b.text).join("\n");

        editor.commands.setSuggestion({
          id: result.id,
          from: result.selectionFrom,
          to: result.selectionTo,
          newText: newText || "",
          nodeType: result.nodeType,
        });
        invalidate();

        // Signal auto-open via custom event
        window.dispatchEvent(
          new CustomEvent("suggestion-created", {
            detail: {
              id: result.id,
              from: result.selectionFrom,
              to: result.selectionTo,
            },
          })
        );
      },
      onError: (err) => toast.error(t("failedRetry", { message: err.message })),
    })
  );

  const close = useCallback(() => {
    setActiveSuggestionId(null);
    setPosition(null);
  }, []);

  // Listen for clicks on suggestion decorations
  useEffect(() => {
    if (!editor) return;

    const editorDom = editor.view.dom;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const suggestionEl = target.closest(
        "[data-suggestion-id]"
      ) as HTMLElement | null;

      if (suggestionEl) {
        const suggestionId = suggestionEl.getAttribute("data-suggestion-id");
        if (!suggestionId) return;

        // Toggle if same
        if (suggestionId === activeSuggestionId) {
          close();
          return;
        }

        const rect = suggestionEl.getBoundingClientRect();
        setActiveSuggestionId(suggestionId);
        setPosition({
          top: rect.bottom + 6,
          left: rect.left,
        });
      }
    };

    editorDom.addEventListener("click", handleClick);
    return () => editorDom.removeEventListener("click", handleClick);
  }, [editor, activeSuggestionId, close]);

  // Close on click outside
  useEffect(() => {
    if (!activeSuggestionId) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        const target = e.target as HTMLElement;
        if (target.closest("[data-suggestion-id]")) return;
        close();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [activeSuggestionId, close]);

  // Adjust position to stay in viewport
  useEffect(() => {
    if (!popoverRef.current || !position) return;
    const rect = popoverRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let { top, left } = position;

    if (left + rect.width > vw - 16) {
      left = vw - rect.width - 16;
    }
    if (left < 16) left = 16;

    if (top + rect.height > vh - 16) {
      const el = document.querySelector(
        `[data-suggestion-id="${activeSuggestionId}"]`
      );
      if (el) {
        const elRect = el.getBoundingClientRect();
        top = elRect.top - rect.height - 6;
      }
    }

    if (top !== position.top || left !== position.left) {
      setPosition({ top, left });
    }
  }, [position, activeSuggestionId]);

  // Auto-clear recently applied after 30 seconds
  useEffect(() => {
    if (recentlyApplied.size === 0) return;
    const timer = setTimeout(() => setRecentlyApplied(new Set()), 30_000);
    return () => clearTimeout(timer);
  }, [recentlyApplied]);

  // Find the active suggestion data
  const suggestions = (pendingSuggestions ?? []) as SuggestionRecord[];
  const suggestion = suggestions.find((s) => s.id === activeSuggestionId);
  const wasJustApplied = activeSuggestionId
    ? recentlyApplied.has(activeSuggestionId)
    : false;

  if (!activeSuggestionId || !position) return null;

  // Loading state: event fired but query hasn't returned data yet
  const isLoading = !suggestion && !wasJustApplied;

  const handleApply = () => {
    if (!editor || !suggestion) return;

    editor.commands.clearSuggestion(suggestion.id);

    const { tr } = editor.state;

    if (isBlocksFormat(suggestion.operations)) {
      const blocks = suggestion.operations;
      const nodes = blocks
        .map((block) => {
          const nodeType = editor.schema.nodes[block.type];
          if (!nodeType) return null;
          return nodeType.create(
            null,
            block.text ? editor.schema.text(block.text) : null
          );
        })
        .filter((n): n is NonNullable<typeof n> => n != null);

      if (nodes.length > 0) {
        const fragment = Fragment.from(nodes);
        const $from = tr.doc.resolve(suggestion.selectionFrom);
        const $to = tr.doc.resolve(suggestion.selectionTo);
        const startBlock = $from.before($from.depth);
        const endBlock = $to.after($to.depth);
        tr.replaceWith(startBlock, endBlock, fragment);
      }

      editor.view.dispatch(tr);
    }

    applyMutation.mutate({ id: suggestion.id });

    setRecentlyApplied((prev) => new Set([...prev, suggestion.id]));
  };

  const handleElse = () => {
    if (!editor || !suggestion) return;

    // Compute previous result
    let previousResult: string;
    if (isBlocksFormat(suggestion.operations)) {
      previousResult = suggestion.operations
        .map((b) => `[${b.type}] ${b.text}`)
        .join("\n");
    } else {
      const ops = suggestion.operations as Array<{
        type: string;
        content?: string;
      }>;
      previousResult = ops
        .filter((op) => op.type === "replace" || op.type === "insert")
        .map((op) => op.content ?? "")
        .join("");
    }

    // Clear current
    editor.commands.clearSuggestion(suggestion.id);
    rejectMutation.mutate({ id: suggestion.id });

    // Get editor context
    const contextBefore = editor.state.doc.textBetween(
      Math.max(0, suggestion.selectionFrom - 500),
      suggestion.selectionFrom,
      "\n"
    );
    const contextAfter = editor.state.doc.textBetween(
      suggestion.selectionTo,
      Math.min(
        editor.state.doc.content.size,
        suggestion.selectionTo + 500
      ),
      "\n"
    );

    const $from = editor.state.doc.resolve(suggestion.selectionFrom);
    const nodeType = $from.parent.type.name;

    // Extract blocks
    const blocks: Array<{ type: string; text: string }> = [];
    editor.state.doc.nodesBetween(
      suggestion.selectionFrom,
      suggestion.selectionTo,
      (node) => {
        if (node.isBlock && node.isTextblock) {
          blocks.push({ type: node.type.name, text: node.textContent });
          return false;
        }
      }
    );

    close();

    rewriteMutation.mutate({
      documentId,
      selectionFrom: suggestion.selectionFrom,
      selectionTo: suggestion.selectionTo,
      selectedText: suggestion.selectedText,
      instruction: suggestion.instruction,
      contextBefore,
      contextAfter,
      nodeType,
      previousResult,
      blocks: blocks.length > 0 ? blocks : undefined,
    });
  };

  const handleDismiss = () => {
    if (!editor || !suggestion) return;
    editor.commands.clearSuggestion(suggestion.id);
    rejectMutation.mutate({ id: suggestion.id });
    close();
  };

  const handleUndo = () => {
    if (!activeSuggestionId) return;
    undoMutation.mutate({ id: activeSuggestionId });
    setRecentlyApplied((prev) => {
      const next = new Set(prev);
      next.delete(activeSuggestionId);
      return next;
    });
    close();
  };

  // Compute preview text from operations
  let newTextPreview = "";
  if (suggestion && isBlocksFormat(suggestion.operations)) {
    newTextPreview = suggestion.operations.map((b) => b.text).join("\n");
  }

  return (
    <AnimatePresence>
      <motion.div
        key={activeSuggestionId}
        ref={popoverRef}
        initial={{ opacity: 0, y: -4, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 w-80 rounded-lg border border-border bg-background/95 shadow-xl backdrop-blur-sm"
        style={{ top: position.top, left: position.left }}
      >
        {/* Recently applied state */}
        {wasJustApplied && !suggestion && (
          <div className="p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                <Check className="h-3 w-3 text-emerald-400" />
              </div>
              <span className="flex-1 text-[11px] text-muted-foreground">
                {t("applied")}
              </span>
              <button
                onClick={handleUndo}
                disabled={undoMutation.isPending}
                className="flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                <Undo2 className="h-3 w-3" />
                {t("undo")}
              </button>
              <button
                onClick={close}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Loading state — waiting for query data */}
        {isLoading && (
          <div className="flex items-center gap-2 p-3">
            <Loader2 className="h-4 w-4 animate-spin text-ai-accent" />
            <span className="text-[11px] text-muted-foreground">
              {t("loading")}
            </span>
            <button
              onClick={close}
              className="ml-auto rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Active suggestion */}
        {suggestion && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-ai-accent" />
                <span className="text-[10px] font-medium text-ai-accent">
                  {t("aiSuggestion")}
                </span>
              </div>
              <button
                onClick={close}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {/* Instruction & explanation */}
            <div className="border-t border-border/50 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">
                  {suggestion.createdBy.name}
                </span>{" "}
                {t("asked", { instruction: suggestion.instruction })}
              </p>
              {suggestion.explanation && (
                <p className="mt-1 text-[10px] italic text-muted-foreground/80">
                  {suggestion.explanation}
                </p>
              )}
            </div>

            {/* Diff preview */}
            <div className="border-t border-border/30 px-3 py-2">
              <div className="max-h-28 overflow-y-auto rounded-md bg-muted/30 p-2 font-mono text-[10px] leading-relaxed">
                {/* Original (removal) */}
                <div className="text-red-400/80 line-through">
                  {suggestion.selectedText.length > 120
                    ? suggestion.selectedText.slice(0, 120) + "..."
                    : suggestion.selectedText}
                </div>
                {/* New (addition) */}
                {newTextPreview && (
                  <div className="mt-1 text-emerald-400/90">
                    {newTextPreview.length > 120
                      ? newTextPreview.slice(0, 120) + "..."
                      : newTextPreview}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 border-t border-border/50 px-3 py-2">
              <button
                onClick={handleApply}
                disabled={applyMutation.isPending}
                className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[10px] font-medium text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
                {t("apply")}
              </button>
              <button
                onClick={handleElse}
                disabled={rewriteMutation.isPending}
                className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[10px] font-medium text-foreground transition-all hover:bg-muted disabled:opacity-50"
              >
                {rewriteMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                {t("else")}
              </button>
              <button
                onClick={handleDismiss}
                disabled={rejectMutation.isPending}
                className="flex items-center gap-1 rounded-md bg-red-600/80 px-2.5 py-1 text-[10px] font-medium text-white transition-all hover:bg-red-500 disabled:opacity-50"
              >
                <X className="h-3 w-3" />
                {t("dismiss")}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
