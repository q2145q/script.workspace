"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Wand2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Fragment, type PmNode } from "@script/editor";
import type { Editor } from "@script/editor";

interface FormatAllDialogProps {
  editor: Editor | null;
  documentId: string;
}

interface Chunk {
  from: number;
  to: number;
  text: string;
  contextBefore: string;
  contextAfter: string;
}

const CHUNK_SIZE = 5000; // characters per chunk

/** Split the editor document into chunks of approximately CHUNK_SIZE characters */
function chunkDocument(editor: Editor): Chunk[] {
  const doc = editor.state.doc;
  const chunks: Chunk[] = [];
  let currentChunkStart = -1;
  let currentChunkText = "";
  let currentFrom = 0;

  doc.forEach((node, offset) => {
    const text = node.textContent;
    const nodeEnd = offset + node.nodeSize;

    if (currentChunkStart === -1) {
      currentChunkStart = offset;
      currentFrom = offset;
    }

    currentChunkText += text + "\n";

    if (currentChunkText.length >= CHUNK_SIZE) {
      chunks.push({
        from: currentFrom,
        to: nodeEnd,
        text: currentChunkText.trim(),
        contextBefore: "",
        contextAfter: "",
      });
      currentChunkStart = -1;
      currentChunkText = "";
    }
  });

  // Remaining content
  if (currentChunkText.trim()) {
    chunks.push({
      from: currentFrom,
      to: doc.content.size,
      text: currentChunkText.trim(),
      contextBefore: "",
      contextAfter: "",
    });
  }

  // Add context (previous/next chunk text) for better formatting
  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) {
      chunks[i].contextBefore = chunks[i - 1].text.slice(-500);
    }
    if (i < chunks.length - 1) {
      chunks[i].contextAfter = chunks[i + 1].text.slice(0, 500);
    }
  }

  return chunks;
}

export function FormatAllDialog({ editor, documentId }: FormatAllDialogProps) {
  const t = useTranslations("FormatAll");
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const cancelledRef = useRef(false);

  const formatMutation = useMutation(
    trpc.ai.format.mutationOptions()
  );

  const totalBlocks = editor ? editor.state.doc.childCount : 0;

  const handleFormatAll = useCallback(async () => {
    if (!editor) return;

    const chunks = chunkDocument(editor);
    if (chunks.length === 0) {
      toast.error(t("noContent"));
      return;
    }

    setIsProcessing(true);
    cancelledRef.current = false;
    setProgress({ current: 0, total: chunks.length });

    // Process chunks in REVERSE order so positions stay valid
    let processedCount = 0;
    for (let i = chunks.length - 1; i >= 0; i--) {
      if (cancelledRef.current) break;

      const chunk = chunks[i];
      try {
        const result = await formatMutation.mutateAsync({
          documentId,
          selectionFrom: chunk.from,
          selectionTo: chunk.to,
          selectedText: chunk.text,
          contextBefore: chunk.contextBefore,
          contextAfter: chunk.contextAfter,
        });

        // Apply blocks to editor
        if (result.blocks && result.blocks.length > 0) {
          const nodes = result.blocks
            .map((block: { type: string; text: string }) => {
              const nodeType = editor.schema.nodes[block.type];
              if (!nodeType) return null;
              return nodeType.create(null, block.text ? editor.schema.text(block.text) : null);
            })
            .filter(Boolean) as PmNode[];

          if (nodes.length > 0) {
            const fragment = Fragment.from(nodes);
            const { tr } = editor.state;
            tr.replaceWith(chunk.from, chunk.to, fragment);
            editor.view.dispatch(tr);
          }
        }

        processedCount++;
        setProgress({ current: processedCount, total: chunks.length });
      } catch (err) {
        console.error(`[format-all] Chunk ${i} failed:`, err);
        // Continue with remaining chunks
      }
    }

    setIsProcessing(false);
    if (!cancelledRef.current) {
      toast.success(t("completed"));
      setOpen(false);
    } else {
      toast.info(t("cancelled"));
    }
  }, [editor, documentId, formatMutation, t]);

  const handleCancel = () => {
    if (isProcessing) {
      cancelledRef.current = true;
    } else {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={t("title")}
      >
        <Wand2 className="h-3.5 w-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isProcessing && setOpen(false)}
            />

            <motion.div
              className="glass-panel relative z-10 w-full max-w-sm rounded-xl border border-border p-6 shadow-2xl"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
                <button
                  onClick={() => !isProcessing && setOpen(false)}
                  disabled={isProcessing}
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {!isProcessing ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t("description", { count: totalBlocks })}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {t("undoHint")}
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setOpen(false)}
                      className="rounded-md border border-border px-4 py-1.5 text-sm text-muted-foreground hover:bg-muted"
                    >
                      {t("cancel")}
                    </button>
                    <button
                      onClick={handleFormatAll}
                      className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      {t("start")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-foreground">
                      {t("progress", { current: progress.current, total: progress.total })}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleCancel}
                      className="rounded-md border border-border px-4 py-1.5 text-sm text-muted-foreground hover:bg-muted"
                    >
                      {t("stopProcessing")}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
