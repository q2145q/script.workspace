"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import type { Editor, SuggestionData } from "@script/editor";
import { Fragment } from "@script/editor";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface AICommandBarProps {
  editor: Editor | null;
  documentId: string;
}

const FORMAT_PATTERN = /^\/?format$/i;

export function AICommandBar({ editor, documentId }: AICommandBarProps) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [selection, setSelection] = useState<{
    from: number;
    to: number;
    text: string;
    nodeType: string;
    contextBefore: string;
    contextAfter: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const trpc = useTRPC();

  const rewriteMutation = useMutation(
    trpc.ai.rewrite.mutationOptions({
      onSuccess: (result) => {
        if (!editor || !selection) return;

        const newText = result.operations
          .filter((op) => op.type === "replace" || op.type === "insert")
          .map((op) => op.content ?? "")
          .join("");

        const suggestionData: SuggestionData = {
          id: result.id,
          from: selection.from,
          to: selection.to,
          newText: newText || selection.text,
          nodeType: result.nodeType ?? selection.nodeType,
        };

        editor.commands.setSuggestion(suggestionData);

        setOpen(false);
        setInstruction("");
      },
      onError: (err) => {
        toast.error(err.message);
      },
    })
  );

  const formatMutation = useMutation(
    trpc.ai.format.mutationOptions({
      onSuccess: (result) => {
        if (!editor || !selection) return;

        // Build properly typed screenplay nodes
        const nodes = result.blocks
          .map((block) => {
            const nodeType = editor.schema.nodes[block.type];
            if (!nodeType) return null;
            return nodeType.create(null, block.text ? editor.schema.text(block.text) : null);
          })
          .filter((n): n is NonNullable<typeof n> => n != null);

        if (nodes.length > 0) {
          const fragment = Fragment.from(nodes);

          // Find the range of block nodes that contain the selection
          const $from = editor.state.doc.resolve(selection.from);
          const $to = editor.state.doc.resolve(selection.to);
          const startBlock = $from.before($from.depth);
          const endBlock = $to.after($to.depth);

          const { tr } = editor.state;
          tr.replaceWith(startBlock, endBlock, fragment);
          editor.view.dispatch(tr);

          toast.success(result.explanation || "Text formatted into screenplay blocks");
        }

        setOpen(false);
        setInstruction("");
      },
      onError: (err) => {
        toast.error(err.message);
      },
    })
  );

  const isPending = rewriteMutation.isPending || formatMutation.isPending;

  // Listen for Cmd+K
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();

        const { from, to } = editor.state.selection;
        if (from === to) {
          toast.error("Select some text first");
          return;
        }

        const text = editor.state.doc.textBetween(from, to, " ");

        const $from = editor.state.doc.resolve(from);
        const nodeType = $from.parent.type.name;

        const contextBefore = editor.state.doc.textBetween(
          Math.max(0, from - 500),
          from,
          " "
        );
        const contextAfter = editor.state.doc.textBetween(
          to,
          Math.min(editor.state.doc.content.size, to + 500),
          " "
        );

        setSelection({ from, to, text, nodeType, contextBefore, contextAfter });
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSubmit = useCallback(() => {
    if (!instruction.trim() || !selection) return;

    const trimmed = instruction.trim();

    if (FORMAT_PATTERN.test(trimmed)) {
      // /format command — restructure into screenplay blocks
      formatMutation.mutate({
        documentId,
        selectionFrom: selection.from,
        selectionTo: selection.to,
        selectedText: selection.text,
        contextBefore: selection.contextBefore,
        contextAfter: selection.contextAfter,
      });
    } else {
      // Regular rewrite
      rewriteMutation.mutate({
        documentId,
        selectionFrom: selection.from,
        selectionTo: selection.to,
        selectedText: selection.text,
        instruction: trimmed,
        contextBefore: selection.contextBefore,
        contextAfter: selection.contextAfter,
        nodeType: selection.nodeType,
      });
    }
  }, [instruction, selection, documentId, rewriteMutation, formatMutation]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setInstruction("");
    setSelection(null);
    editor?.commands.focus();
  }, [editor]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            onClick={handleClose}
          />

          {/* Command bar */}
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="ai-command-bar fixed left-1/2 top-1/3 z-50 w-full max-w-lg -translate-x-1/2 rounded-xl p-1"
          >
            <div className="flex items-center gap-3 px-3 py-2">
              <Sparkles className="h-4 w-4 shrink-0 text-ai-accent" />
              <input
                ref={inputRef}
                type="text"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                  if (e.key === "Escape") {
                    handleClose();
                  }
                }}
                placeholder='Rewrite instruction or "/format" to auto-format...'
                disabled={isPending}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin text-ai-accent" />
              ) : instruction.trim() ? (
                <kbd className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  Enter
                </kbd>
              ) : null}
            </div>

            {selection && (
              <div className="border-t border-border/50 px-3 py-1.5">
                <p className="truncate text-[10px] text-muted-foreground">
                  Selected: &ldquo;{selection.text.slice(0, 80)}
                  {selection.text.length > 80 ? "..." : ""}&rdquo;
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
