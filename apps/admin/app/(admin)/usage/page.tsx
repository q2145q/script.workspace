"use client";

import { useState, useEffect, useCallback } from "react";

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

interface ByUser {
  userId: string;
  user: { name: string; email: string };
  _count: number;
  _sum: { tokensIn: number | null; tokensOut: number | null; costUsd: number | null };
}

interface UsageData {
  aggregate: AggregateStats;
  byProvider: ByProvider[];
  byUser: ByUser[];
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

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function UsagePage() {
  const [range, setRange] = useState("7d");
  const [data, setData] = useState<UsageData | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/admin/usage?range=${range}`);
    if (res.ok) setData(await res.json());
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!data) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6">Использование API</h1>
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  const { aggregate, byProvider, byUser } = data;

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

      {/* By Provider */}
      <h2 className="text-lg font-medium mb-3">По провайдерам</h2>
      <div className="admin-card overflow-x-auto p-0 mb-8">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Провайдер</th>
              <th>Запросов</th>
              <th>Токены In</th>
              <th>Токены Out</th>
              <th>Стоимость</th>
            </tr>
          </thead>
          <tbody>
            {byProvider.map((p) => (
              <tr key={p.provider}>
                <td className="font-medium">{PROVIDER_LABELS[p.provider] || p.provider}</td>
                <td>{formatNum(p._count)}</td>
                <td>{formatNum(p._sum.tokensIn || 0)}</td>
                <td>{formatNum(p._sum.tokensOut || 0)}</td>
                <td>${(p._sum.costUsd || 0).toFixed(2)}</td>
              </tr>
            ))}
            {byProvider.length === 0 && (
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
      <h2 className="text-lg font-medium mb-3">По пользователям</h2>
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
              <tr key={u.userId}>
                <td className="font-medium">{u.user.name}</td>
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
