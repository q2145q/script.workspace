"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Trash2, RotateCcw } from "lucide-react";
import type { Editor } from "@script/editor";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface CommentPopoverProps {
  editor: Editor | null;
  documentId: string;
}

function timeAgo(date: Date, tc: (key: string, values?: Record<string, number>) => string): string {
  const now = Date.now();
  const d = new Date(date).getTime();
  const seconds = Math.floor((now - d) / 1000);
  if (seconds < 60) return tc("timeJustNow");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return tc("timeMinutesAgo", { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return tc("timeHoursAgo", { hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return tc("timeDaysAgo", { days });
  return new Date(date).toLocaleDateString();
}

function MiniAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ai-accent text-[9px] font-semibold text-ai-accent-foreground">
      {initials}
    </div>
  );
}

/** Remove comment mark by threadId from the document */
function removeCommentMark(editor: Editor, threadId: string) {
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
  if (from !== null && to !== null) {
    const commentType = editor.schema.marks.comment;
    editor.view.dispatch(
      editor.state.tr.removeMark(from, to, commentType)
    );
  }
}

export function CommentPopover({ editor, documentId }: CommentPopoverProps) {
  const t = useTranslations("Comments");
  const tc = useTranslations("Common");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [replyText, setReplyText] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const threadsQuery = useQuery(
    trpc.comment.list.queryOptions({ documentId })
  );

  const invalidateThreads = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.comment.list.queryKey({ documentId }),
    });

  const resolveMutation = useMutation(
    trpc.comment.resolve.mutationOptions({
      onSuccess: () => {
        invalidateThreads();
        if (editor && activeThreadId) {
          const thread = (threadsQuery.data ?? []).find(
            (t: { id: string }) => t.id === activeThreadId
          );
          const wasResolved = thread?.resolved ?? false;

          if (!wasResolved) {
            // Resolving: remove the comment mark entirely (no more highlight)
            removeCommentMark(editor, activeThreadId);
          } else {
            // Reopening: re-add the comment mark
            // (mark was removed on resolve, so nothing to do — the mark is already gone)
          }
        }
        close();
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const deleteMutation = useMutation(
    trpc.comment.delete.mutationOptions({
      onSuccess: () => {
        invalidateThreads();
        close();
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const replyMutation = useMutation(
    trpc.comment.addMessage.mutationOptions({
      onSuccess: () => {
        invalidateThreads();
        setReplyText("");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const close = useCallback(() => {
    setActiveThreadId(null);
    setPosition(null);
    setReplyText("");
  }, []);

  // Listen for clicks on comment marks in the editor
  useEffect(() => {
    if (!editor) return;

    const editorDom = editor.view.dom;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const commentSpan = target.closest(
        "span[data-comment-thread-id]"
      ) as HTMLElement | null;

      if (commentSpan) {
        const threadId = commentSpan.getAttribute("data-comment-thread-id");
        if (!threadId) return;

        // If same thread already open, close it
        if (threadId === activeThreadId) {
          close();
          return;
        }

        // Position using fixed coords relative to viewport
        const spanRect = commentSpan.getBoundingClientRect();

        setActiveThreadId(threadId);
        setPosition({
          top: spanRect.bottom + 6,
          left: spanRect.left,
        });
        setReplyText("");
      }
    };

    editorDom.addEventListener("click", handleClick);
    return () => editorDom.removeEventListener("click", handleClick);
  }, [editor, activeThreadId, close]);

  // Close on click outside
  useEffect(() => {
    if (!activeThreadId) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        // Don't close if clicking on a comment span (handled above)
        const target = e.target as HTMLElement;
        if (target.closest("span[data-comment-thread-id]")) return;
        close();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    // Use setTimeout to avoid catching the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [activeThreadId, close]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!popoverRef.current || !position) return;
    const rect = popoverRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let { top, left } = position;

    // Keep within horizontal bounds
    if (left + rect.width > vw - 16) {
      left = vw - rect.width - 16;
    }
    if (left < 16) left = 16;

    // If would go below viewport, show above the text
    if (top + rect.height > vh - 16) {
      // Re-find the span to get its top edge
      const span = document.querySelector(
        `span[data-comment-thread-id="${activeThreadId}"]`
      );
      if (span) {
        const spanRect = span.getBoundingClientRect();
        top = spanRect.top - rect.height - 6;
      }
    }

    if (top !== position.top || left !== position.left) {
      setPosition({ top, left });
    }
  }, [position, activeThreadId]);

  // Find the thread data
  type ThreadData = {
    id: string;
    resolved: boolean;
    createdAt: Date;
    messages: Array<{
      id: string;
      content: string;
      createdAt: Date;
      author: { id: string; name: string; image: string | null };
    }>;
  };
  const threads = (threadsQuery.data ?? []) as ThreadData[];
  const thread = threads.find((t) => t.id === activeThreadId);

  if (!activeThreadId || !position || !thread) return null;

  const firstMessage = thread.messages[0];
  const replies = thread.messages.slice(1);

  return (
    <AnimatePresence>
      <motion.div
        key={activeThreadId}
        ref={popoverRef}
        initial={{ opacity: 0, y: -4, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 w-72 rounded-lg border border-border bg-background/95 shadow-xl backdrop-blur-sm"
        style={{ top: position.top, left: position.left }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5">
          <span
            className={`text-[10px] font-medium ${
              thread.resolved
                ? "text-muted-foreground"
                : "text-ai-accent"
            }`}
          >
            {thread.resolved ? t("resolved") : t("comment")}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => resolveMutation.mutate({ id: thread.id })}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={thread.resolved ? t("reopen") : t("resolve")}
            >
              {thread.resolved ? (
                <RotateCcw className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </button>
            <button
              onClick={() => {
                if (editor) removeCommentMark(editor, thread.id);
                deleteMutation.mutate({ id: thread.id });
              }}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
              title={tc("delete")}
            >
              <Trash2 className="h-3 w-3" />
            </button>
            <button
              onClick={close}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="max-h-52 overflow-y-auto border-t border-border/50">
          {/* First message */}
          {firstMessage && (
            <div className="px-3 py-2">
              <div className="flex items-start gap-2">
                <MiniAvatar name={firstMessage.author.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-foreground">
                      {firstMessage.author.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {timeAgo(firstMessage.createdAt, tc)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-foreground/90">
                    {firstMessage.content}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Replies */}
          {replies.length > 0 && (
            <div className="border-t border-border/30 px-3 py-1">
              {replies.map((msg) => (
                <div key={msg.id} className="flex items-start gap-2 py-1.5">
                  <MiniAvatar name={msg.author.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-foreground">
                        {msg.author.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {timeAgo(msg.createdAt, tc)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-foreground/90">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reply input — only for open threads */}
        {!thread.resolved && (
          <div className="border-t border-border/50 p-2">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && replyText.trim()) {
                    e.preventDefault();
                    replyMutation.mutate({
                      threadId: thread.id,
                      content: replyText.trim(),
                    });
                  }
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    close();
                  }
                }}
                placeholder={t("replyPlaceholder")}
                className="flex-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus={false}
              />
              {replyText.trim() && (
                <button
                  onClick={() =>
                    replyMutation.mutate({
                      threadId: thread.id,
                      content: replyText.trim(),
                    })
                  }
                  disabled={replyMutation.isPending}
                  className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {tc("reply")}
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
