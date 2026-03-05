"use client";

import { useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Undo2, RefreshCw, Loader2 } from "lucide-react";
import type { Editor } from "@script/editor";
import { Fragment } from "@script/editor";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface SuggestionPreviewProps {
  editor: Editor | null;
  documentId: string;
}

interface AppliedEntry {
  selectedText: string;
  selectionFrom: number;
  selectionTo: number;
  blocks: Array<{ type: string; text: string }>;
}

const UNDO_TIMEOUT_MS = 30_000;

/** Detect if stored operations are blocks format (new) vs legacy operations format */
function isBlocksFormat(data: unknown): data is Array<{ type: string; text: string }> {
  if (!Array.isArray(data) || data.length === 0) return false;
  const first = data[0];
  return typeof first === "object" && first !== null && "text" in first && "type" in first && !("from" in first);
}

export function SuggestionPreview({ editor, documentId }: SuggestionPreviewProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [recentlyApplied, setRecentlyApplied] = useState<Map<string, AppliedEntry>>(new Map());

  // Auto-expire undo entries after 30 seconds
  useEffect(() => {
    if (recentlyApplied.size === 0) return;

    const timer = setTimeout(() => {
      setRecentlyApplied(new Map());
    }, UNDO_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [recentlyApplied]);

  const { data: pendingSuggestions } = useQuery(
    trpc.suggestion.pending.queryOptions({ documentId })
  );

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
      onError: (err) => toast.error(`Failed to apply: ${err.message}`),
    })
  );

  const rejectMutation = useMutation(
    trpc.suggestion.reject.mutationOptions({
      onSuccess: invalidate,
      onError: (err) => toast.error(`Failed to dismiss: ${err.message}`),
    })
  );

  const undoMutation = useMutation(
    trpc.suggestion.undo.mutationOptions({
      onSuccess: invalidate,
      onError: (err) => toast.error(`Failed to undo: ${err.message}`),
    })
  );

  // "Else" — retry with different result
  const rewriteMutation = useMutation(
    trpc.ai.rewrite.mutationOptions({
      onSuccess: (result) => {
        if (!editor) return;

        const newText = result.blocks
          .map((b) => b.text)
          .join("\n");

        editor.commands.setSuggestion({
          id: result.id,
          from: result.selectionFrom,
          to: result.selectionTo,
          newText: newText || "",
          nodeType: result.nodeType,
        });
        invalidate();
      },
      onError: (err) => toast.error(`Retry failed: ${err.message}`),
    })
  );

  const handleApply = useCallback(
    (suggestion: { id: string; operations: unknown; selectedText: string; selectionFrom: number; selectionTo: number; nodeType?: string }) => {
      if (!editor) return;

      editor.commands.clearSuggestion(suggestion.id);

      const { tr } = editor.state;

      if (isBlocksFormat(suggestion.operations)) {
        // New blocks format — create typed screenplay nodes
        const blocks = suggestion.operations;
        const nodes = blocks
          .map((block) => {
            const nodeType = editor.schema.nodes[block.type];
            if (!nodeType) return null;
            return nodeType.create(null, block.text ? editor.schema.text(block.text) : null);
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

        // Track for undo — store blocks and positions
        setRecentlyApplied((prev) => {
          const next = new Map(prev);
          next.set(suggestion.id, {
            selectedText: suggestion.selectedText,
            selectionFrom: suggestion.selectionFrom,
            selectionTo: suggestion.selectionTo,
            blocks,
          });
          return next;
        });
      } else {
        // Legacy operations format (backward compat for old DB suggestions)
        const ops = suggestion.operations as Array<{
          type: string;
          from: number;
          to: number;
          content?: string;
          nodeType?: string;
        }>;

        const newText = ops
          .filter((op) => op.type === "replace" || op.type === "insert")
          .map((op) => op.content ?? "")
          .join("");

        const targetNodeType = suggestion.nodeType
          ?? ops.find((op) => op.nodeType)?.nodeType
          ?? editor.state.doc.resolve(suggestion.selectionFrom).parent.type.name;

        for (const op of ops) {
          if (op.type === "replace" && op.content) {
            tr.replaceWith(
              suggestion.selectionFrom + op.from,
              suggestion.selectionFrom + op.to,
              editor.schema.text(op.content)
            );
          }
        }

        const schemaNodeType = editor.schema.nodes[targetNodeType];
        if (schemaNodeType) {
          const $pos = tr.doc.resolve(suggestion.selectionFrom);
          const parentNode = $pos.parent;
          if (parentNode.type.name !== targetNodeType) {
            const blockStart = $pos.before($pos.depth);
            tr.setNodeMarkup(blockStart, schemaNodeType, parentNode.attrs);
          }
        }

        editor.view.dispatch(tr);

        setRecentlyApplied((prev) => {
          const next = new Map(prev);
          next.set(suggestion.id, {
            selectedText: suggestion.selectedText,
            selectionFrom: suggestion.selectionFrom,
            selectionTo: suggestion.selectionTo,
            blocks: [{ type: targetNodeType, text: newText }],
          });
          return next;
        });
      }

      applyMutation.mutate({ id: suggestion.id });
    },
    [editor, applyMutation]
  );

  const handleElse = useCallback(
    (suggestion: {
      id: string;
      operations: unknown;
      selectedText: string;
      selectionFrom: number;
      selectionTo: number;
      instruction: string;
      nodeType?: string;
    }) => {
      if (!editor) return;

      // Convert blocks or operations to previousResult string
      let previousResult: string;
      if (isBlocksFormat(suggestion.operations)) {
        previousResult = suggestion.operations
          .map((b) => `[${b.type}] ${b.text}`)
          .join("\n");
      } else {
        const ops = suggestion.operations as Array<{ type: string; content?: string }>;
        previousResult = ops
          .filter((op) => op.type === "replace" || op.type === "insert")
          .map((op) => op.content ?? "")
          .join("");
      }

      // Clear the current decoration and reject it
      editor.commands.clearSuggestion(suggestion.id);
      rejectMutation.mutate({ id: suggestion.id });

      // Get context from editor
      const contextBefore = editor.state.doc.textBetween(
        Math.max(0, suggestion.selectionFrom - 500),
        suggestion.selectionFrom,
        "\n"
      );
      const contextAfter = editor.state.doc.textBetween(
        suggestion.selectionTo,
        Math.min(editor.state.doc.content.size, suggestion.selectionTo + 500),
        "\n"
      );

      const $from = editor.state.doc.resolve(suggestion.selectionFrom);
      const nodeType = suggestion.nodeType || $from.parent.type.name;

      // Extract current blocks from selection for retry
      const blocks: Array<{ type: string; text: string }> = [];
      editor.state.doc.nodesBetween(suggestion.selectionFrom, suggestion.selectionTo, (node) => {
        if (node.isBlock && node.isTextblock) {
          blocks.push({ type: node.type.name, text: node.textContent });
          return false;
        }
      });

      // Request a new rewrite with the previous result
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
    },
    [editor, documentId, rejectMutation, rewriteMutation]
  );

  const handleDismiss = useCallback(
    (suggestionId: string) => {
      if (!editor) return;
      editor.commands.clearSuggestion(suggestionId);
      rejectMutation.mutate({ id: suggestionId });
    },
    [editor, rejectMutation]
  );

  const handleUndo = useCallback(
    (suggestionId: string) => {
      if (!editor) return;
      const entry = recentlyApplied.get(suggestionId);
      if (!entry) return;

      // Undo by restoring original text as single text in the original node type
      // The best approach: use ProseMirror history (Ctrl+Z behavior)
      // But for our tracking mechanism, we need a simple undo:
      const { tr } = editor.state;
      const $from = tr.doc.resolve(entry.selectionFrom);
      const $to = tr.doc.resolve(entry.selectionTo);

      // Try to find block range to replace
      try {
        const startBlock = $from.before($from.depth);
        const endBlock = $to.after($to.depth);

        // Reconstruct original text as a single node (best effort)
        const parentType = editor.schema.nodes[$from.parent.type.name] || editor.schema.nodes.action;
        const originalNode = parentType.create(null, editor.schema.text(entry.selectedText));
        tr.replaceWith(startBlock, endBlock, originalNode);
      } catch {
        // Fallback: simple text replacement at original position
        tr.replaceWith(
          entry.selectionFrom,
          entry.selectionTo,
          editor.schema.text(entry.selectedText)
        );
      }

      editor.view.dispatch(tr);

      // Remove from recently applied
      setRecentlyApplied((prev) => {
        const next = new Map(prev);
        next.delete(suggestionId);
        return next;
      });

      undoMutation.mutate({ id: suggestionId });
    },
    [editor, recentlyApplied, undoMutation]
  );

  const hasPending = pendingSuggestions && pendingSuggestions.length > 0;
  const hasUndo = recentlyApplied.size > 0;

  if (!hasPending && !hasUndo) return null;

  return (
    <div className="border-t border-border p-3">
      {/* Pending suggestions */}
      {hasPending && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-ai-accent animate-pulse" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-ai-accent">
                {pendingSuggestions.length} pending suggestion{pendingSuggestions.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-2">
              {pendingSuggestions.map((s) => (
                <div key={s.id} className="rounded-lg border border-border bg-muted/30 p-2.5">
                  <p className="mb-1.5 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">{s.createdBy.name}</span>
                    {" "}asked: &ldquo;{s.instruction}&rdquo;
                  </p>

                  {s.explanation && (
                    <p className="mb-2 text-[10px] italic text-muted-foreground">
                      {s.explanation}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleApply({
                          id: s.id,
                          operations: s.operations,
                          selectedText: s.selectedText,
                          selectionFrom: s.selectionFrom,
                          selectionTo: s.selectionTo,
                        })
                      }
                      disabled={applyMutation.isPending}
                      className="flex items-center gap-1 rounded-md bg-suggestion-add-border px-2.5 py-1 text-[10px] font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" />
                      Apply
                    </button>
                    <button
                      onClick={() =>
                        handleElse({
                          id: s.id,
                          operations: s.operations,
                          selectedText: s.selectedText,
                          selectionFrom: s.selectionFrom,
                          selectionTo: s.selectionTo,
                          instruction: s.instruction,
                        })
                      }
                      disabled={rewriteMutation.isPending}
                      className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[10px] font-medium text-foreground transition-all duration-200 hover:bg-muted disabled:opacity-50"
                    >
                      {rewriteMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Else
                    </button>
                    <button
                      onClick={() => handleDismiss(s.id)}
                      disabled={rejectMutation.isPending}
                      className="flex items-center gap-1 rounded-md bg-suggestion-remove-border px-2.5 py-1 text-[10px] font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Recently applied — undo available */}
      {hasUndo && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={hasPending ? "mt-2" : ""}
          >
            <div className="space-y-2">
              {Array.from(recentlyApplied.entries()).map(([id]) => (
                <div key={id} className="flex items-center gap-2 rounded-lg border border-suggestion-add-border/30 bg-suggestion-add/10 p-2.5">
                  <span className="flex-1 text-[10px] text-muted-foreground">
                    Suggestion applied
                  </span>
                  <button
                    onClick={() => handleUndo(id)}
                    disabled={undoMutation.isPending}
                    className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[10px] font-medium text-foreground transition-all duration-200 hover:bg-muted disabled:opacity-50"
                  >
                    <Undo2 className="h-3 w-3" />
                    Undo
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
