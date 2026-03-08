"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle } from "lucide-react";

interface AiLog {
  id: string;
  userId: string;
  provider: string;
  model: string;
  feature: string;
  status: string;
  errorMessage: string | null;
  durationMs: number | null;
  tokensIn: number;
  tokensOut: number;
  createdAt: string;
  user: { name: string; email: string };
}

interface LogsData {
  logs: AiLog[];
  total: number;
  page: number;
  totalPages: number;
  errorCount: number;
  totalCount: number;
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
  gemini: "Gemini",
  yandex: "Yandex",
  grok: "Grok",
};

export default function AiLogsPage() {
  const [data, setData] = useState<LogsData | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [providerFilter, setProviderFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (statusFilter) params.set("status", statusFilter);
      if (providerFilter) params.set("provider", providerFilter);

      const res = await fetch(`/api/admin/ai-logs?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка загрузки";
      setError(msg);
      toast.error(msg);
    }
  }, [page, statusFilter, providerFilter]);

  useEffect(() => { setPage(1); }, [statusFilter, providerFilter]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6">AI Response Logs</h1>
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
          <button onClick={() => { setError(null); fetchLogs(); }} className="ml-2 underline">Повторить</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6">AI Response Logs</h1>
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  const errorRate = data.totalCount > 0 ? ((data.errorCount / data.totalCount) * 100).toFixed(1) : "0";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">AI Response Logs</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">{data.total} записей</span>
          <span className="text-red-400 flex items-center gap-1">
            <AlertTriangle size={14} />
            {data.errorCount} ошибок ({errorRate}%)
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          className="admin-input w-auto text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Все статусы</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
        </select>
        <select
          className="admin-input w-auto text-sm"
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
        >
          <option value="">Все провайдеры</option>
          {Object.entries(PROVIDER_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Logs table */}
      <div className="admin-card overflow-x-auto p-0">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Время</th>
              <th>Статус</th>
              <th>Пользователь</th>
              <th>Провайдер</th>
              <th>Модель</th>
              <th>Функция</th>
              <th>Длительность</th>
              <th>Токены</th>
              <th>Ошибка</th>
            </tr>
          </thead>
          <tbody>
            {data.logs.map((log) => (
              <tr key={log.id}>
                <td className="text-muted-foreground whitespace-nowrap text-xs">
                  {new Date(log.createdAt).toLocaleString("ru", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </td>
                <td>
                  {log.status === "error" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-red-400">
                      <AlertTriangle size={12} /> Error
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-green-400">
                      <CheckCircle size={12} /> OK
                    </span>
                  )}
                </td>
                <td className="text-sm">
                  <div className="font-medium">{log.user.name}</div>
                  <div className="text-xs text-muted-foreground">{log.user.email}</div>
                </td>
                <td className="text-sm">{PROVIDER_LABELS[log.provider] || log.provider}</td>
                <td className="text-xs text-muted-foreground">{log.model}</td>
                <td className="text-xs">{log.feature}</td>
                <td className="text-xs text-muted-foreground">
                  {log.durationMs != null ? `${(log.durationMs / 1000).toFixed(1)}s` : "—"}
                </td>
                <td className="text-xs text-muted-foreground">
                  {log.tokensIn + log.tokensOut > 0
                    ? `${log.tokensIn}/${log.tokensOut}`
                    : "—"}
                </td>
                <td className="text-xs max-w-[200px] truncate" title={log.errorMessage || ""}>
                  {log.errorMessage ? (
                    <span className="text-red-400">{log.errorMessage}</span>
                  ) : "—"}
                </td>
              </tr>
            ))}
            {data.logs.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-muted-foreground py-8">
                  Нет записей
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
