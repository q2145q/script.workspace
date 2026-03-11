"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface AggregateStats {
  totalRequests: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
  avgTokensIn: number;
  avgTokensOut: number;
}

interface ByProvider {
  provider: string;
  _count: number;
  _sum: { tokensIn: number | null; tokensOut: number | null; costUsd: number | null };
}

interface ByModel {
  provider: string;
  model: string;
  _count: number;
  _sum: { tokensIn: number | null; tokensOut: number | null; costUsd: number | null };
}

interface ByFeature {
  feature: string;
  _count: number;
  _sum: { tokensIn: number | null; tokensOut: number | null; costUsd: number | null };
}

interface ByUser {
  userId: string;
  user: { name: string; email: string };
  _count: number;
  _sum: { tokensIn: number | null; tokensOut: number | null; costUsd: number | null };
}

interface DailyEntry {
  day: string;
  requests: number;
  cost: number;
}

interface UsageData {
  aggregate: AggregateStats;
  byProvider: ByProvider[];
  byModel: ByModel[];
  byFeature: ByFeature[];
  byUser: ByUser[];
  daily: DailyEntry[];
}

const RANGES = [
  { id: "today", label: "Сегодня" },
  { id: "7d", label: "7 дней" },
  { id: "30d", label: "30 дней" },
  { id: "all", label: "Всё время" },
];

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
  gemini: "Gemini",
  yandex: "Yandex",
  grok: "Grok",
};

const FEATURE_LABELS: Record<string, string> = {
  chat: "Chat",
  rewrite: "Rewrite",
  format: "Format",
  "dialogue-pass": "Dialogue Pass",
  analysis: "Scene Analysis",
  "character-analysis": "Character Analysis",
  "structure-analysis": "Structure Analysis",
  "consistency-check": "Consistency Check",
  "beat-sheet": "Beat Sheet",
  "pacing-analysis": "Pacing Analysis",
  logline: "Logline",
  synopsis: "Synopsis",
  "describe-character": "Describe Character",
  "describe-location": "Describe Location",
  "knowledge-graph": "Knowledge Graph",
  "scene-synopsis": "Scene Synopsis",
  "act-assignment": "Act Assignment",
};

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function DailyChart({ data }: { data: DailyEntry[] }) {
  if (data.length === 0) return null;

  const maxRequests = Math.max(...data.map((d) => d.requests), 1);

  return (
    <div className="admin-card mb-8">
      <h2 className="text-lg font-medium mb-4">Запросов по дням</h2>
      <div className="flex items-end gap-1" style={{ height: 120 }}>
        {data.map((d) => {
          const height = Math.max((d.requests / maxRequests) * 100, 2);
          const dateStr = new Date(d.day).toLocaleDateString("ru", { day: "numeric", month: "short" });
          return (
            <div
              key={d.day}
              className="flex-1 flex flex-col items-center gap-1 min-w-0"
              title={`${dateStr}: ${d.requests} запросов, $${d.cost.toFixed(2)}`}
            >
              <span className="text-[10px] text-muted-foreground">
                {d.requests > 0 ? d.requests : ""}
              </span>
              <div
                className="w-full rounded-t transition-all hover:opacity-80"
                style={{
                  height: `${height}%`,
                  background: "linear-gradient(to top, hsl(var(--accent)), hsl(var(--accent) / 0.6))",
                  minHeight: 2,
                }}
              />
              <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                {data.length <= 14 ? dateStr : ""}
              </span>
            </div>
          );
        })}
      </div>
      {data.length > 0 && (
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>
            {new Date(data[0]!.day).toLocaleDateString("ru", { day: "numeric", month: "short" })}
          </span>
          <span>
            {new Date(data[data.length - 1]!.day).toLocaleDateString("ru", { day: "numeric", month: "short" })}
          </span>
        </div>
      )}
    </div>
  );
}

export default function UsagePage() {
  const [range, setRange] = useState("7d");
  const [data, setData] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/usage?range=${range}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка загрузки данных";
      setError(msg);
      toast.error(msg);
    }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6">Использование API</h1>
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
          <button onClick={() => { setError(null); fetchData(); }} className="ml-2 underline">Повторить</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6">Использование API</h1>
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  const { aggregate, byProvider, byModel, byFeature, byUser, daily } = data;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Использование API</h1>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                range === r.id
                  ? "bg-accent text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="admin-card">
          <p className="text-sm text-muted-foreground">Запросов</p>
          <p className="text-2xl font-bold">{formatNum(aggregate.totalRequests)}</p>
        </div>
        <div className="admin-card">
          <p className="text-sm text-muted-foreground">Токенов (вход)</p>
          <p className="text-2xl font-bold">{formatNum(aggregate.totalTokensIn)}</p>
          <p className="text-xs text-muted-foreground">avg {formatNum(aggregate.avgTokensIn)}/req</p>
        </div>
        <div className="admin-card">
          <p className="text-sm text-muted-foreground">Токенов (выход)</p>
          <p className="text-2xl font-bold">{formatNum(aggregate.totalTokensOut)}</p>
          <p className="text-xs text-muted-foreground">avg {formatNum(aggregate.avgTokensOut)}/req</p>
        </div>
        <div className="admin-card">
          <p className="text-sm text-muted-foreground">Общая стоимость</p>
          <p className="text-2xl font-bold">${aggregate.totalCostUsd.toFixed(2)}</p>
        </div>
        <div className="admin-card">
          <p className="text-sm text-muted-foreground">Всего токенов</p>
          <p className="text-2xl font-bold">
            {formatNum(aggregate.totalTokensIn + aggregate.totalTokensOut)}
          </p>
        </div>
        <div className="admin-card">
          <p className="text-sm text-muted-foreground">Средняя стоимость/запрос</p>
          <p className="text-2xl font-bold">
            ${aggregate.totalRequests > 0 ? (aggregate.totalCostUsd / aggregate.totalRequests).toFixed(4) : "0.00"}
          </p>
        </div>
      </div>

      {/* Daily Chart */}
      <DailyChart data={daily} />

      {/* By Provider & By Model side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-lg font-medium mb-3">По провайдерам</h2>
          <div className="admin-card overflow-x-auto p-0">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Провайдер</th>
                  <th>Запросов</th>
                  <th>Токены</th>
                  <th>Стоимость</th>
                </tr>
              </thead>
              <tbody>
                {byProvider.map((p) => (
                  <tr key={p.provider}>
                    <td className="font-medium">{PROVIDER_LABELS[p.provider] || p.provider}</td>
                    <td>{formatNum(p._count)}</td>
                    <td>{formatNum((p._sum.tokensIn || 0) + (p._sum.tokensOut || 0))}</td>
                    <td>${(p._sum.costUsd || 0).toFixed(2)}</td>
                  </tr>
                ))}
                {byProvider.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted-foreground py-6">
                      Нет данных
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-medium mb-3">По моделям</h2>
          <div className="admin-card overflow-x-auto p-0">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Модель</th>
                  <th>Запросов</th>
                  <th>Токены</th>
                  <th>Стоимость</th>
                </tr>
              </thead>
              <tbody>
                {byModel.map((m) => (
                  <tr key={`${m.provider}:${m.model}`}>
                    <td className="font-medium">
                      <span className="text-muted-foreground text-xs mr-1">
                        {PROVIDER_LABELS[m.provider] || m.provider}
                      </span>
                      {m.model}
                    </td>
                    <td>{formatNum(m._count)}</td>
                    <td>{formatNum((m._sum.tokensIn || 0) + (m._sum.tokensOut || 0))}</td>
                    <td>${(m._sum.costUsd || 0).toFixed(2)}</td>
                  </tr>
                ))}
                {byModel.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted-foreground py-6">
                      Нет данных
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* By Feature */}
      <h2 className="text-lg font-medium mb-3">По функциям</h2>
      <div className="admin-card overflow-x-auto p-0 mb-8">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Функция</th>
              <th>Запросов</th>
              <th>Токены In</th>
              <th>Токены Out</th>
              <th>Стоимость</th>
            </tr>
          </thead>
          <tbody>
            {byFeature.map((f) => (
              <tr key={f.feature}>
                <td className="font-medium">{FEATURE_LABELS[f.feature] || f.feature}</td>
                <td>{formatNum(f._count)}</td>
                <td>{formatNum(f._sum.tokensIn || 0)}</td>
                <td>{formatNum(f._sum.tokensOut || 0)}</td>
                <td>${(f._sum.costUsd || 0).toFixed(2)}</td>
              </tr>
            ))}
            {byFeature.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted-foreground py-6">
                  Нет данных
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* By User */}
      <h2 className="text-lg font-medium mb-3">По пользователям (топ 50)</h2>
      <div className="admin-card overflow-x-auto p-0">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Email</th>
              <th>Запросов</th>
              <th>Токены In</th>
              <th>Токены Out</th>
              <th>Стоимость</th>
            </tr>
          </thead>
          <tbody>
            {byUser.map((u) => (
              <tr
                key={u.userId}
                className="cursor-pointer hover:bg-accent/5"
                onClick={() => window.location.href = `/users/${u.userId}`}
              >
                <td className="font-medium text-accent">{u.user.name}</td>
                <td className="text-muted-foreground">{u.user.email}</td>
                <td>{formatNum(u._count)}</td>
                <td>{formatNum(u._sum.tokensIn || 0)}</td>
                <td>{formatNum(u._sum.tokensOut || 0)}</td>
                <td>${(u._sum.costUsd || 0).toFixed(2)}</td>
              </tr>
            ))}
            {byUser.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground py-6">
                  Нет данных
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
