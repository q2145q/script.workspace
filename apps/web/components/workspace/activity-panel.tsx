"use client";

import { useTRPC } from "@/lib/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Activity, FileText, LogIn, LogOut, MessageSquare, CheckCircle, Pencil } from "lucide-react";

interface ActivityPanelProps {
  projectId: string;
}

const actionConfig: Record<string, { label: string; icon: typeof Activity; color: string }> = {
  edit: { label: "edited", icon: Pencil, color: "text-blue-400" },
  join: { label: "joined", icon: LogIn, color: "text-emerald-400" },
  leave: { label: "left", icon: LogOut, color: "text-muted-foreground" },
  comment_add: { label: "added a comment", icon: MessageSquare, color: "text-amber-400" },
  comment_resolve: { label: "resolved a comment", icon: CheckCircle, color: "text-emerald-400" },
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function ActivityPanel({ projectId }: ActivityPanelProps) {
  const trpc = useTRPC();

  const { data, isLoading } = useQuery({
    ...trpc.activity.list.queryOptions({ projectId, limit: 50 }),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-ai-accent border-t-transparent" />
      </div>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <Activity className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="space-y-0.5 p-3">
        {items.map((item) => {
          const details = item.details as { userName?: string; documentType?: string } | null;
          const userName = details?.userName || "Unknown";
          const config = actionConfig[item.action] || { label: item.action, icon: Activity, color: "text-muted-foreground" };
          const Icon = config.icon;
          const docTitle = (item as { document?: { title: string } | null }).document?.title;

          return (
            <div
              key={item.id}
              className="flex items-start gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted/30"
            >
              <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted ${config.color}`}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="min-w-0 flex-1">
                <div>
                  <span className="font-medium text-foreground">{userName}</span>{" "}
                  <span className="text-muted-foreground">{config.label}</span>
                  {docTitle && (
                    <>
                      {" "}
                      <span className="inline-flex items-center gap-0.5 text-foreground/70">
                        <FileText className="inline h-3 w-3" />
                        {docTitle}
                      </span>
                    </>
                  )}
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground/60">
                  {timeAgo(new Date(item.createdAt))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
