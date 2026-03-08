"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

interface Report {
  id: string;
  userId: string;
  message: string;
  page: string | null;
  context: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  user: { name: string; email: string };
}

interface ReportsData {
  reports: Report[];
  total: number;
  page: number;
  totalPages: number;
  statusCounts: Record<string, number>;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: typeof MessageSquare }> = {
  new: { label: "Новое", color: "text-blue-400", icon: AlertCircle },
  in_progress: { label: "В работе", color: "text-yellow-400", icon: Clock },
  resolved: { label: "Решено", color: "text-green-400", icon: CheckCircle },
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/reports?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка загрузки";
      setError(msg);
      toast.error(msg);
    }
  }, [page, statusFilter]);

  useEffect(() => { setPage(1); }, [statusFilter]);
  useEffect(() => { fetchReports(); }, [fetchReports]);

  async function updateReport(id: string, status?: string, adminNote?: string) {
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, adminNote }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Обновлено");
      fetchReports();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    }
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6">Обращения пользователей</h1>
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
          <button onClick={() => { setError(null); fetchReports(); }} className="ml-2 underline">Повторить</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6">Обращения пользователей</h1>
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Обращения пользователей</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {Object.entries(STATUS_LABELS).map(([key, { label, color }]) => (
            <span key={key} className={color}>
              {label}: {data.statusCounts[key] || 0}
            </span>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-4">
        <select
          className="admin-input w-auto text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Все статусы</option>
          <option value="new">Новые</option>
          <option value="in_progress">В работе</option>
          <option value="resolved">Решённые</option>
        </select>
      </div>

      {/* Reports list */}
      <div className="space-y-3">
        {data.reports.map((report) => {
          const st = STATUS_LABELS[report.status] || STATUS_LABELS.new;
          const StatusIcon = st.icon;
          const isExpanded = expandedId === report.id;

          return (
            <div key={report.id} className="admin-card">
              <div
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => {
                  setExpandedId(isExpanded ? null : report.id);
                  setNoteText(report.adminNote || "");
                }}
              >
                <StatusIcon size={18} className={`mt-0.5 shrink-0 ${st.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{report.user.name}</span>
                    <span className="text-xs text-muted-foreground">{report.user.email}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(report.createdAt).toLocaleString("ru", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{report.message}</p>
                  {report.page && (
                    <span className="text-xs text-muted-foreground mt-1 block">
                      Страница: {report.page}
                    </span>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border space-y-3">
                  {report.context && (
                    <div>
                      <span className="text-xs text-muted-foreground">Контекст:</span>
                      <p className="text-xs mt-1 bg-muted/50 rounded p-2">{report.context}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Заметка админа:</label>
                    <textarea
                      className="admin-input text-sm w-full"
                      rows={2}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    {report.status !== "in_progress" && (
                      <button
                        className="admin-btn-sm text-yellow-400 border-yellow-400/30"
                        onClick={() => updateReport(report.id, "in_progress", noteText)}
                      >
                        В работу
                      </button>
                    )}
                    {report.status !== "resolved" && (
                      <button
                        className="admin-btn-sm text-green-400 border-green-400/30"
                        onClick={() => updateReport(report.id, "resolved", noteText)}
                      >
                        Решено
                      </button>
                    )}
                    {noteText !== (report.adminNote || "") && (
                      <button
                        className="admin-btn-sm"
                        onClick={() => updateReport(report.id, undefined, noteText)}
                      >
                        Сохранить заметку
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {data.reports.length === 0 && (
          <div className="admin-card text-center text-muted-foreground py-8">
            <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
            Нет обращений
          </div>
        )}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            Стр. {data.page} из {data.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="admin-btn-sm disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="admin-btn-sm disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
