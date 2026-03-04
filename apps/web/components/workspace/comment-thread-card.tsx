"use client";

import { useState } from "react";

interface CommentAuthor {
  id: string;
  name: string;
  image: string | null;
}

interface CommentMessage {
  id: string;
  content: string;
  createdAt: Date;
  author: CommentAuthor;
}

export interface CommentThread {
  id: string;
  anchorFrom: number;
  anchorTo: number;
  resolved: boolean;
  createdAt: Date;
  createdBy: CommentAuthor;
  messages: CommentMessage[];
}

interface CommentThreadCardProps {
  thread: CommentThread;
  isActive: boolean;
  onSelect: () => void;
  onResolve: () => void;
  onDelete: () => void;
  onReply: (content: string) => void;
  isReplying: boolean;
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ai-accent text-[10px] font-semibold text-ai-accent-foreground">
      {initials}
    </div>
  );
}

function timeAgo(date: Date): string {
  const now = Date.now();
  const d = new Date(date).getTime();
  const seconds = Math.floor((now - d) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function CommentThreadCard({
  thread,
  isActive,
  onSelect,
  onResolve,
  onDelete,
  onReply,
  isReplying,
}: CommentThreadCardProps) {
  const [replyText, setReplyText] = useState("");
  const [showActions, setShowActions] = useState(false);

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(replyText.trim());
    setReplyText("");
  };

  const firstMessage = thread.messages[0];
  const replies = thread.messages.slice(1);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={`cursor-pointer rounded-lg border transition-all duration-200 ${
        isActive
          ? "border-ai-accent/30 bg-ai-glow shadow-sm shadow-ai-accent/10"
          : "border-transparent hover:border-border hover:bg-muted/50"
      } ${thread.resolved ? "opacity-60" : ""}`}
    >
      {/* First message — thread starter */}
      {firstMessage && (
        <div className="p-3 pb-2">
          <div className="flex items-start gap-2.5">
            <Avatar name={firstMessage.author.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-foreground">
                    {firstMessage.author.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {timeAgo(firstMessage.createdAt)}
                  </span>
                </div>
                {/* Actions menu */}
                {(showActions || isActive) && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onResolve();
                      }}
                      className="rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
                      title={thread.resolved ? "Reopen" : "Resolve"}
                    >
                      {thread.resolved ? "Reopen" : "Resolve"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                      className="rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-destructive"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-foreground/90">
                {firstMessage.content}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div className="border-t border-[var(--color-border)]/50 px-3 py-1.5">
          {replies.map((msg) => (
            <div key={msg.id} className="flex items-start gap-2.5 py-1.5">
              <Avatar name={msg.author.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-foreground">
                    {msg.author.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {timeAgo(msg.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-foreground/90">
                  {msg.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply input — shown when active */}
      {isActive && !thread.resolved && (
        <div className="border-t border-border/50 p-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleReply();
                }
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Reply..."
              className="flex-1 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {replyText.trim() && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReply();
                }}
                disabled={isReplying}
                className="rounded-full bg-primary px-3 py-1.5 text-[10px] font-medium text-primary-foreground transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              >
                Reply
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
