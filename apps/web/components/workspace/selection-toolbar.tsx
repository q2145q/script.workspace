"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Type, Pin, Loader2, X, MessageSquare, Drama, SpellCheck, Check, XCircle } from "lucide-react";
import type { Editor, SuggestionData } from "@script/editor";
import { Fragment } from "@script/editor";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { formatTokenEstimate } from "@/lib/token-estimate";

interface SelectionToolbarProps {
  editor: Editor | null;
  documentId: string;
  projectId: string;
  onSuggestionCreated?: (detail: { id: string; from: number; to: number }) => void;
}

interface SelectionInfo {
  from: number;
  to: number;
  text: string;
  nodeType: string;
  blocks: Array<{ type: string; text: string }>;
  contextBefore: string;
  contextAfter: string;
}

function getSelectionInfo(editor: Editor): SelectionInfo | null {
  const { from, to } = editor.state.selection;
  if (from === to) return null;

  const text = editor.state.doc.textBetween(from, to, "\n");
  const $from = editor.state.doc.resolve(from);
  const nodeType = $from.parent.type.name;

  const blocks: Array<{ type: string; text: string }> = [];
  editor.state.doc.nodesBetween(from, to, (node) => {
    if (node.isBlock && node.isTextblock) {
      blocks.push({ type: node.type.name, text: node.textContent });
      return false;
    }
  });

  const contextBefore = editor.state.doc.textBetween(
    Math.max(0, from - 500),
    from,
    "\n"
  );
  const contextAfter = editor.state.doc.textBetween(
    to,
    Math.min(editor.state.doc.content.size, to + 500),
    "\n"
  );

  return { from, to, text, nodeType, blocks, contextBefore, contextAfter };
}

function getToolbarPosition(editor: Editor) {
  const { from, to } = editor.state.selection;
  const start = editor.view.coordsAtPos(from);
  const end = editor.view.coordsAtPos(to);

  // Center horizontally between start and end
  const left = (start.left + end.left) / 2;
  // Position above the selection by default
  const top = start.top;

  return { left, top };
}

export function SelectionToolbar({ editor, documentId, projectId, onSuggestionCreated }: SelectionToolbarProps) {
  const t = useTranslations("Editor");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [visible, setVisible] = useState(false);
  const [rewriteMode, setRewriteMode] = useState(false);
  const [commentMode, setCommentMode] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [commentText, setCommentText] = useState("");
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [flipBelow, setFlipBelow] = useState(false);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<SelectionInfo | null>(null);

  // --- mutations ---

  const formatMutation = useMutation(
    trpc.ai.format.mutationOptions({
      onSuccess: (result) => {
        if (!editor || !selectionRef.current) return;
        const sel = selectionRef.current;

        const nodes = result.blocks
          .map((block) => {
            const nodeType = editor.schema.nodes[block.type];
            if (!nodeType) return null;
            return nodeType.create(null, block.text ? editor.schema.text(block.text) : null);
          })
          .filter((n): n is NonNullable<typeof n> => n != null);

        if (nodes.length > 0) {
          const fragment = Fragment.from(nodes);
          const $from = editor.state.doc.resolve(sel.from);
          const $to = editor.state.doc.resolve(sel.to);
          const startBlock = $from.before($from.depth);
          const endBlock = $to.after($to.depth);

          const { tr } = editor.state;
          tr.replaceWith(startBlock, endBlock, fragment);
          editor.view.dispatch(tr);
          // Collapse selection to end of replaced content
          editor.commands.setTextSelection(startBlock + fragment.size);

          toast.success(result.explanation || t("textFormatted"));
        }

        hideToolbar();
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const rewriteMutation = useMutation(
    trpc.ai.rewrite.mutationOptions({
      onSuccess: (result) => {
        if (!editor || !selectionRef.current) return;
        const sel = selectionRef.current;

        const newText = result.blocks.map((b) => b.text).join("\n");

        const suggestionData: SuggestionData = {
          id: result.id,
          from: sel.from,
          to: sel.to,
          newText: newText || sel.text,
          nodeType: result.nodeType ?? sel.nodeType,
        };

        editor.commands.setSuggestion(suggestionData);

        // Signal SuggestionPopover to auto-open
        onSuggestionCreated?.({ id: result.id, from: sel.from, to: sel.to });

        hideToolbar();
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const pinMutation = useMutation(
    trpc.pin.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.pin.list.queryKey({ projectId }),
        });
        toast.success(t("pinAdded"));
        hideToolbar();
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const commentMutation = useMutation(
    trpc.comment.create.mutationOptions({
      onSuccess: (thread) => {
        if (!editor || !selectionRef.current) return;
        const sel = selectionRef.current;

        // Apply comment mark to the selected text
        editor
          .chain()
          .focus()
          .setTextSelection({ from: sel.from, to: sel.to })
          .setComment({ threadId: thread.id })
          .run();

        queryClient.invalidateQueries({
          queryKey: trpc.comment.list.queryKey({ documentId }),
        });

        toast.success(t("commentAdded"));
        hideToolbar();
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const dialoguePassMutation = useMutation(
    trpc.ai.dialoguePass.mutationOptions({
      onSuccess: (result) => {
        if (!editor || !selectionRef.current) return;
        const sel = selectionRef.current;

        const newText = result.blocks.map((b) => b.text).join("\n");

        const suggestionData: SuggestionData = {
          id: result.id,
          from: sel.from,
          to: sel.to,
          newText: newText || sel.text,
          nodeType: result.nodeType ?? sel.nodeType,
        };

        editor.commands.setSuggestion(suggestionData);

        onSuggestionCreated?.({ id: result.id, from: sel.from, to: sel.to });

        hideToolbar();
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const [grammarCorrections, setGrammarCorrections] = useState<
    Array<{ original: string; corrected: string; explanation: string }>
  >([]);
  const [grammarSelRange, setGrammarSelRange] = useState<{ from: number; to: number } | null>(null);

  const fixGrammarMutation = useMutation(
    trpc.ai.fixGrammar.mutationOptions({
      onSuccess: (result) => {
        if (result.corrections.length === 0) {
          toast.success(t("noGrammarErrors"));
          hideToolbar();
          return;
        }
        setGrammarCorrections(result.corrections);
        setGrammarSelRange({ from: result.selectionFrom, to: result.selectionTo });
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const isPending = formatMutation.isPending || rewriteMutation.isPending || commentMutation.isPending || dialoguePassMutation.isPending || fixGrammarMutation.isPending;

  // --- actions ---

  const hideToolbar = useCallback(() => {
    setVisible(false);
    setRewriteMode(false);
    setCommentMode(false);
    setInstruction("");
    setCommentText("");
    setGrammarCorrections([]);
    setGrammarSelRange(null);
    selectionRef.current = null;
  }, []);

  const showToolbar = useCallback(() => {
    if (!editor) return;
    const sel = getSelectionInfo(editor);
    if (!sel) return;

    selectionRef.current = sel;
    const pos = getToolbarPosition(editor);

    // Check if toolbar would be cut off at top (less than 60px from viewport top)
    const shouldFlip = pos.top < 60;
    setFlipBelow(shouldFlip);
    setPosition(pos);
    setVisible(true);
    setRewriteMode(false);
    setCommentMode(false);
    setInstruction("");
    setCommentText("");
  }, [editor]);

  const handleFormat = useCallback(() => {
    const sel = selectionRef.current;
    if (!sel || isPending) return;

    formatMutation.mutate({
      documentId,
      selectionFrom: sel.from,
      selectionTo: sel.to,
      selectedText: sel.text,
      contextBefore: sel.contextBefore,
      contextAfter: sel.contextAfter,
    });
  }, [documentId, formatMutation, isPending]);

  const handleRewrite = useCallback(() => {
    const sel = selectionRef.current;
    if (!sel || !instruction.trim() || isPending) return;

    rewriteMutation.mutate({
      documentId,
      selectionFrom: sel.from,
      selectionTo: sel.to,
      selectedText: sel.text,
      instruction: instruction.trim(),
      contextBefore: sel.contextBefore,
      contextAfter: sel.contextAfter,
      nodeType: sel.nodeType,
      blocks: sel.blocks,
    });
  }, [documentId, instruction, rewriteMutation, isPending]);

  const handleDialoguePass = useCallback(() => {
    const sel = selectionRef.current;
    if (!sel || isPending) return;

    dialoguePassMutation.mutate({
      documentId,
      selectionFrom: sel.from,
      selectionTo: sel.to,
      selectedText: sel.text,
      blocks: sel.blocks,
      contextBefore: sel.contextBefore,
      contextAfter: sel.contextAfter,
    });
  }, [documentId, dialoguePassMutation, isPending]);

  // Check if selection contains dialogue-type blocks
  const isDialogueSelection = selectionRef.current?.blocks.some(
    (b) => b.type === "dialogue" || b.type === "character" || b.type === "parenthetical"
  ) ?? false;

  const handlePin = useCallback(() => {
    const sel = selectionRef.current;
    if (!sel) return;
    if (!sel.text.trim()) return;
    pinMutation.mutate({ projectId, content: sel.text, type: "TEXT" });
  }, [projectId, pinMutation]);

  const handleComment = useCallback(() => {
    const sel = selectionRef.current;
    if (!sel || !commentText.trim() || isPending) return;

    commentMutation.mutate({
      documentId,
      anchorFrom: sel.from,
      anchorTo: sel.to,
      content: commentText.trim(),
    });
  }, [documentId, commentText, commentMutation, isPending]);

  const handleFixGrammar = useCallback(() => {
    const sel = selectionRef.current;
    if (!sel || isPending) return;
    fixGrammarMutation.mutate({
      documentId,
      selectionFrom: sel.from,
      selectionTo: sel.to,
      selectedText: sel.text,
      contextBefore: sel.contextBefore,
      contextAfter: sel.contextAfter,
    });
  }, [documentId, fixGrammarMutation, isPending]);

  const handleAcceptCorrection = useCallback((index: number) => {
    if (!editor) return;
    const correction = grammarCorrections[index];
    if (!correction) return;

    // Search-and-replace in editor content
    const docText = editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n");
    const pos = docText.indexOf(correction.original);
    if (pos !== -1) {
      // +1 because textBetween starts at pos 0 but doc positions start at 1 for top-level content
      editor.chain().focus().insertContentAt(
        { from: pos + 1, to: pos + 1 + correction.original.length },
        correction.corrected
      ).run();
    }

    setGrammarCorrections((prev) => prev.filter((_, i) => i !== index));
  }, [editor, grammarCorrections]);

  const handleAcceptAllCorrections = useCallback(() => {
    if (!editor || grammarCorrections.length === 0) return;

    // Apply all corrections in reverse order by position to avoid offset issues
    const docText = editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n");
    const positioned = grammarCorrections
      .map((c) => ({ ...c, pos: docText.indexOf(c.original) }))
      .filter((c) => c.pos !== -1)
      .sort((a, b) => b.pos - a.pos); // reverse order

    const { tr } = editor.state;
    for (const c of positioned) {
      const from = c.pos + 1;
      const to = from + c.original.length;
      tr.replaceWith(from, to, editor.state.schema.text(c.corrected));
    }
    editor.view.dispatch(tr);

    setGrammarCorrections([]);
    toast.success(t("grammarFixed"));
  }, [editor, grammarCorrections, t]);

  const handleRejectCorrection = useCallback((index: number) => {
    setGrammarCorrections((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const enterRewriteMode = useCallback(() => {
    setRewriteMode(true);
    setCommentMode(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const enterCommentMode = useCallback(() => {
    setCommentMode(true);
    setRewriteMode(false);
    setTimeout(() => commentInputRef.current?.focus(), 50);
  }, []);

  // --- listen for selection changes ---

  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        // No selection — hide if not mid-action
        if (!isPending) {
          hideToolbar();
        }
        return;
      }

      // Show toolbar for non-empty selection
      if (!isPending) {
        showToolbar();
      }
    };

    editor.on("selectionUpdate", handleSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, showToolbar, hideToolbar, isPending]);

  // --- keyboard shortcuts ---

  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+M → Comment mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "m") {
        e.preventDefault();
        const { from, to } = editor.state.selection;
        if (from === to) {
          toast.error(t("selectTextFirst"));
          return;
        }
        showToolbar();
        setCommentMode(true);
        setRewriteMode(false);
        setTimeout(() => commentInputRef.current?.focus(), 100);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();

        const { from, to } = editor.state.selection;
        if (from === to) {
          toast.error(t("selectTextFirst"));
          return;
        }

        if (e.shiftKey) {
          // Cmd+Shift+K → Rewrite mode
          showToolbar();
          setRewriteMode(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        } else {
          // Cmd+K → Format instantly
          const sel = getSelectionInfo(editor);
          if (!sel) return;
          selectionRef.current = sel;

          formatMutation.mutate({
            documentId,
            selectionFrom: sel.from,
            selectionTo: sel.to,
            selectedText: sel.text,
            contextBefore: sel.contextBefore,
            contextAfter: sel.contextAfter,
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor, documentId, formatMutation, showToolbar, t]);

  // --- click outside to close ---

  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        if (!isPending) {
          hideToolbar();
        }
      }
    };

    // Delay to avoid immediate close from the selection click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [visible, hideToolbar, isPending]);

  if (!visible && !isPending) return null;

  return (
    <AnimatePresence>
      {(visible || isPending) && (
        <motion.div
          ref={toolbarRef}
          initial={{ opacity: 0, y: flipBelow ? -4 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: flipBelow ? -4 : 4 }}
          transition={{ duration: 0.15 }}
          className="fixed z-50"
          style={{
            left: `${position.left}px`,
            top: flipBelow ? `${position.top + 28}px` : `${position.top - 8}px`,
            transform: flipBelow
              ? "translateX(-50%)"
              : "translateX(-50%) translateY(-100%)",
          }}
        >
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-popover/95 p-1 shadow-lg backdrop-blur">
            {/* Format button */}
            <button
              data-tutorial="format-button"
              onClick={handleFormat}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              title={`⌘K${selectionRef.current ? ` · ${formatTokenEstimate(selectionRef.current.text)}` : ""}`}
            >
              {formatMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-ai-accent" />
              ) : (
                <Type className="h-3.5 w-3.5" />
              )}
              {t("formatBtn")}
            </button>

            <div className="h-4 w-px bg-border" />

            {/* Rewrite button / input */}
            {rewriteMode ? (
              <div className="flex items-center gap-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleRewrite();
                    }
                    if (e.key === "Escape") {
                      setRewriteMode(false);
                      setInstruction("");
                    }
                  }}
                  placeholder={t("rewritePlaceholder")}
                  disabled={isPending}
                  className="w-48 rounded-md bg-transparent px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                {rewriteMutation.isPending ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin text-ai-accent" />
                ) : instruction.trim() ? (
                  <kbd className="mr-1 shrink-0 rounded border border-border px-1 py-0.5 text-[9px] text-muted-foreground">
                    ↵
                  </kbd>
                ) : (
                  <button
                    onClick={() => {
                      setRewriteMode(false);
                      setInstruction("");
                    }}
                    className="mr-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ) : (
              <button
                data-tutorial="rewrite-button"
                onClick={enterRewriteMode}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                title={`⌘⇧K${selectionRef.current ? ` · ${formatTokenEstimate(selectionRef.current.text)}` : ""}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t("rewriteBtn")}
              </button>
            )}

            {/* Dialogue Pass button — only for dialogue blocks */}
            {isDialogueSelection && !rewriteMode && (
              <>
                <div className="h-4 w-px bg-border" />
                <button
                  data-tutorial="dialogue-button"
                  onClick={handleDialoguePass}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-ai-accent/80 transition-colors hover:bg-ai-accent/10 hover:text-ai-accent disabled:opacity-50"
                  title={t("dialoguePassTitle")}
                >
                  {dialoguePassMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Drama className="h-3.5 w-3.5" />
                  )}
                  {t("dialoguePassBtn")}
                </button>
              </>
            )}

            {/* Fix Grammar button */}
            {!rewriteMode && !commentMode && (
              <>
                <div className="h-4 w-px bg-border" />
                <button
                  onClick={handleFixGrammar}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                  title={t("fixGrammarBtn")}
                >
                  {fixGrammarMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-ai-accent" />
                  ) : (
                    <SpellCheck className="h-3.5 w-3.5" />
                  )}
                  {t("fixGrammarBtn")}
                </button>
              </>
            )}

            <div className="h-4 w-px bg-border" />

            {/* Comment button / input */}
            {commentMode ? (
              <div className="flex items-center gap-1">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleComment();
                    }
                    if (e.key === "Escape") {
                      setCommentMode(false);
                      setCommentText("");
                    }
                  }}
                  placeholder={t("commentPlaceholder")}
                  disabled={isPending}
                  className="w-48 rounded-md bg-transparent px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                {commentMutation.isPending ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin text-ai-accent" />
                ) : commentText.trim() ? (
                  <kbd className="mr-1 shrink-0 rounded border border-border px-1 py-0.5 text-[9px] text-muted-foreground">
                    ↵
                  </kbd>
                ) : (
                  <button
                    onClick={() => {
                      setCommentMode(false);
                      setCommentText("");
                    }}
                    className="mr-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ) : (
              <button
                data-tutorial="comments-button"
                onClick={enterCommentMode}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                title="⌘⇧M"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {t("commentBtn")}
              </button>
            )}

            <div className="h-4 w-px bg-border" />

            {/* Pin button */}
            <button
              onClick={handlePin}
              disabled={pinMutation.isPending}
              className="flex items-center rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              title={t("pinSelection")}
            >
              <Pin className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Grammar corrections panel */}
          {grammarCorrections.length > 0 && (
            <div className="mt-1 max-h-64 w-80 overflow-y-auto rounded-lg border border-border bg-popover/95 p-2 shadow-lg backdrop-blur">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("grammarCorrections", { count: grammarCorrections.length })}
                </span>
                <button
                  onClick={handleAcceptAllCorrections}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-green-500 hover:bg-green-500/10"
                >
                  <Check className="h-3 w-3" />
                  {t("acceptAll")}
                </button>
              </div>
              <div className="space-y-1">
                {grammarCorrections.map((c, i) => (
                  <div key={i} className="group flex items-start gap-2 rounded-md border border-border/50 bg-background/50 p-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs">
                        <span className="line-through text-red-400/80">{c.original}</span>
                        <span className="mx-1 text-muted-foreground">→</span>
                        <span className="text-green-400">{c.corrected}</span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{c.explanation}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        onClick={() => handleAcceptCorrection(i)}
                        className="rounded p-0.5 text-green-500 hover:bg-green-500/10"
                        title={t("accept")}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleRejectCorrection(i)}
                        className="rounded p-0.5 text-red-400 hover:bg-red-400/10"
                        title={t("reject")}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
