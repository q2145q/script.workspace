"use client";

import { useState, useRef, useEffect } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";

export function NotificationBell() {
  const t = useTranslations("Notifications");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Unread count — poll every 60s
  const { data: unreadData } = useQuery({
    ...trpc.notification.unreadCount.queryOptions(),
    refetchInterval: 60_000,
  });
  const unreadCount = unreadData?.count ?? 0;

  // Notification list (fetched when dropdown opens)
  const { data: notificationsData } = useQuery({
    ...trpc.notification.list.queryOptions({ limit: 10 }),
    enabled: open,
  });
  const notifications = notificationsData?.items ?? [];

  // Mutations
  const markReadMutation = useMutation(
    trpc.notification.markRead.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.notification.unreadCount.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.notification.list.queryKey() });
      },
    })
  );

  const markAllReadMutation = useMutation(
    trpc.notification.markAllRead.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.notification.unreadCount.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.notification.list.queryKey() });
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.notification.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.notification.unreadCount.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.notification.list.queryKey() });
      },
    })
  );

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const handleNotificationClick = (notification: { id: string; link?: string | null; read: boolean }) => {
    if (!notification.read) {
      markReadMutation.mutate({ id: notification.id });
    }
    if (notification.link) {
      router.push(notification.link);
      setOpen(false);
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return t("justNow");
    if (minutes < 60) return t("minutesAgo", { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("hoursAgo", { count: hours });
    const days = Math.floor(hours / 24);
    return t("daysAgo", { count: days });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={t("title")}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-background shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-medium">{t("title")}</span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  className="rounded p-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title={t("markAllRead")}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                {t("empty")}
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`group flex cursor-pointer items-start gap-2 border-b border-border/50 px-3 py-2.5 transition-colors hover:bg-muted/50 ${
                    !n.read ? "bg-cinema/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(n)}
                >
                  {/* Unread dot */}
                  <div className="mt-1.5 shrink-0">
                    {!n.read ? (
                      <div className="h-2 w-2 rounded-full bg-cinema" />
                    ) : (
                      <div className="h-2 w-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">{n.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {n.message}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      {formatTime(n.createdAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
                    {!n.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markReadMutation.mutate({ id: n.id });
                        }}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                        title={t("markRead")}
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate({ id: n.id });
                      }}
                      className="rounded p-0.5 text-destructive hover:bg-destructive/10"
                      title={t("deleteNotification")}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
