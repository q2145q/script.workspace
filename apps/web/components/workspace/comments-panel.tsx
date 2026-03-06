"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { Editor } from "@script/editor";
import { useEditorState } from "@script/editor";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CommentThreadCard,
  type CommentThread,
} from "./comment-thread-card";

type Filter = "all" | "open" | "resolved";

interface CommentsPanelProps {
  editor: Editor | null;
  documentId: string;
}

/** Find the range of a comment mark by threadId in the document */
function findCommentRange(
  editor: Editor,
  threadId: string
): { from: number; to: number } | null {
  let from: number | null = null;
  let to: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.isText) {
      const mark = node.marks.find(
        (m) => m.type.name === "comment" && m.attrs.threadId === threadId
      );
      if (mark) {
        if (from === null) from = pos;
        to = pos + node.nodeSize;
      }
    }
  });
  return from !== null && to !== null ? { from, to } : null;
}

/** Remove comment mark by threadId from the document */
function removeCommentMark(editor: Editor, threadId: string) {
  const range = findCommentRange(editor, threadId);
  if (range) {
    const commentType = editor.schema.marks.comment;
    editor.view.dispatch(
      editor.state.tr.removeMark(range.from, range.to, commentType)
    );
  }
}

/** Scroll the editor viewport to a ProseMirror position using DOM */
function scrollToPos(editor: Editor, pos: number) {
  try {
    const domAtPos = editor.view.domAtPos(pos);
    const node = domAtPos.node;
    const element =
      node instanceof HTMLElement ? node : node.parentElement;
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  } catch {
    // Fallback: use ProseMirror scrollIntoView
    editor.chain().setTextSelection(pos).scrollIntoView().run();
  }
}

/** Toggle CSS class on DOM elements for active thread highlight */
function setActiveHighlight(threadId: string | null) {
  // Remove from all
  document
    .querySelectorAll(".comment-highlight-active")
    .forEach((el) => el.classList.remove("comment-highlight-active"));
  // Add to active
  if (threadId) {
    document
      .querySelectorAll(`span[data-comment-thread-id="${threadId}"]`)
      .forEach((el) => el.classList.add("comment-highlight-active"));
  }
}

export function CommentsPanel({ editor, documentId }: CommentsPanelProps) {
  const t = useTranslations("Comments");
  const tCommon = useTranslations("Common");
  const [filter, setFilter] = useState<Filter>("all");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  // Saved selection — persists even when editor loses focus
  const [pendingSelection, setPendingSelection] = useState<{
    from: number;
    to: number;
  } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const threadsQuery = useQuery(
    trpc.comment.list.queryOptions({ documentId })
  );

  const invalidateThreads = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.comment.list.queryKey({ documentId }),
    });

  const createMutation = useMutation(
    trpc.comment.create.mutationOptions({
      onSuccess: invalidateThreads,
      onError: (err) =>
        toast.error(t("failedCreate", { message: err.message })),
    })
  );

  const resolveMutation = useMutation(
    trpc.comment.resolve.mutationOptions({
      onSuccess: invalidateThreads,
      onError: (err) => toast.error(t("failedResolve", { message: err.message })),
    })
  );

  const deleteMutation = useMutation(
    trpc.comment.delete.mutationOptions({
      onSuccess: invalidateThreads,
      onError: (err) => toast.error(t("failedDelete", { message: err.message })),
    })
  );

  const replyMutation = useMutation(
    trpc.comment.addMessage.mutationOptions({
      onSuccess: invalidateThreads,
      onError: (err) => toast.error(t("failedReply", { message: err.message })),
    })
  );

  // Track editor selection — save it so it persists when textarea gets focus
  const editorSelection = useEditorState({
    editor: editor!,
    selector: (ctx) => {
      if (!ctx.editor) return null;
      const { from, to } = ctx.editor.state.selection;
      return from !== to ? { from, to } : null;
    },
  });

  useEffect(() => {
    if (editorSelection) {
      setPendingSelection(editorSelection);
    }
    // Don't clear when null — user may be typing in comment form
  }, [editorSelection]);

  // Show decoration in editor for pending selection
  useEffect(() => {
    if (!editor) return;
    if (pendingSelection) {
      editor
        .chain()
        .setSelectionHighlight(pendingSelection)
        .run();
    } else {
      editor.chain().clearSelectionHighlight().run();
    }
  }, [editor, pendingSelection]);

  // Detect comment mark at cursor → auto-activate thread
  const commentAtCursor = useEditorState({
    editor: editor!,
    selector: (ctx) => {
      if (!ctx.editor) return null;
      const { from } = ctx.editor.state.selection;
      const resolved = ctx.editor.state.doc.resolve(from);
      const marks = resolved.marks();
      const commentMark = marks.find((m) => m.type.name === "comment");
      return commentMark?.attrs.threadId ?? null;
    },
  });

  // Auto-activate thread when cursor is inside a comment mark
  useEffect(() => {
    if (commentAtCursor) {
      setActiveThreadId(commentAtCursor);
    }
  }, [commentAtCursor]);

  // Toggle active highlight CSS class on DOM elements
  useEffect(() => {
    setActiveHighlight(activeThreadId);
    return () => setActiveHighlight(null);
  }, [activeThreadId]);

  const handleAddComment = useCallback(() => {
    if (!editor || !newCommentText.trim() || !pendingSelection) return;
    const { from, to } = pendingSelection;

    createMutation.mutate(
      {
        documentId,
        anchorFrom: from,
        anchorTo: to,
        content: newCommentText.trim(),
      },
      {
        onSuccess: (thread) => {
          // Clear decoration first
          editor.chain().clearSelectionHighlight().run();
          editor
            .chain()
            .focus()
            .setTextSelection({ from, to })
            .setComment({ threadId: thread.id })
            .run();
          setActiveThreadId(thread.id);
          setNewCommentText("");
          setPendingSelection(null);
        },
      }
    );
  }, [editor, newCommentText, pendingSelection, documentId, createMutation]);

  const handleCancelComment = useCallback(() => {
    if (editor) {
      editor.chain().clearSelectionHighlight().run();
    }
    setPendingSelection(null);
    setNewCommentText("");
  }, [editor]);

  const handleSelectThread = useCallback(
    (thread: CommentThread) => {
      setActiveThreadId(thread.id);
      if (!editor) return;
      // Find the mark in the document (positions shift as content is edited)
      const range = findCommentRange(editor, thread.id);
      if (range) {
        // Scroll via DOM for reliable behavior
        scrollToPos(editor, range.from);
        // Set selection after scroll
        editor
          .chain()
          .setTextSelection(range.from)
          .run();
      }
    },
    [editor]
  );

  const handleResolve = useCallback(
    (thread: CommentThread) => {
      resolveMutation.mutate(
        { id: thread.id },
        {
          onSuccess: () => {
            if (!editor) return;
            const range = findCommentRange(editor, thread.id);
            if (range) {
              // Update the mark's resolved attribute
              const commentType = editor.schema.marks.comment;
              const tr = editor.state.tr;
              tr.removeMark(range.from, range.to, commentType);
              tr.addMark(
                range.from,
                range.to,
                commentType.create({
                  threadId: thread.id,
                  resolved: !thread.resolved,
                })
              );
              editor.view.dispatch(tr);
            }
          },
        }
      );
    },
    [editor, resolveMutation]
  );

  const handleDelete = useCallback(
    (thread: CommentThread) => {
      if (editor) {
        removeCommentMark(editor, thread.id);
      }
      deleteMutation.mutate({ id: thread.id });
      if (activeThreadId === thread.id) {
        setActiveThreadId(null);
      }
    },
    [editor, deleteMutation, activeThreadId]
  );

  const threads = (threadsQuery.data ?? []) as CommentThread[];
  const filteredThreads = threads.filter((thread) => {
    if (filter === "open") return !thread.resolved;
    if (filter === "resolved") return thread.resolved;
    return true;
  });

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: t("all") },
    { id: "open", label: t("open") },
    { id: "resolved", label: t("resolved") },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Filter tabs — pill-shaped */}
      <div className="flex gap-1 border-b border-border px-3 py-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-all duration-200 ${
              filter === f.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Add comment form — shown when text is selected */}
      {pendingSelection && (
        <div ref={formRef} className="glass-panel border-b border-border p-3">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAddComment();
              }
            }}
            placeholder={t("addPlaceholder")}
            rows={2}
            autoFocus
            className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none transition-colors duration-200"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddComment}
              disabled={createMutation.isPending || !newCommentText.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all duration-200 hover:opacity-90 disabled:opacity-50"
            >
              {createMutation.isPending ? t("adding") : t("comment")}
            </button>
            <button
              type="button"
              onClick={handleCancelComment}
              className="rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              {tCommon("cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {threadsQuery.isLoading ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            {tCommon("loading")}
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            {filter === "all"
              ? t("noComments")
              : filter === "open"
                ? t("noOpen")
                : t("noResolved")}
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredThreads.map((thread) => (
              <CommentThreadCard
                key={thread.id}
                thread={thread}
                isActive={activeThreadId === thread.id}
                onSelect={() => handleSelectThread(thread)}
                onResolve={() => handleResolve(thread)}
                onDelete={() => handleDelete(thread)}
                onReply={(content) =>
                  replyMutation.mutate({ threadId: thread.id, content })
                }
                isReplying={replyMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
