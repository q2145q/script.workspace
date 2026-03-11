"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldOff,
  Mail,
  Calendar,
  Send,
  Trash2,
} from "lucide-react";

// --- Types ---

interface UserInfo {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  betaApproved: boolean;
  banned: boolean;
  telegramChatId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { ownedProjects: number };
}

interface OverviewData {
  usageStats: {
    _sum: { tokensIn: number | null; tokensOut: number | null; costUsd: number | null };
    _count: number;
  };
  errorCount: number;
  projectCount: number;
}

interface RequestLog {
  id: string;
  provider: string;
  model: string;
  feature: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  durationMs: number;
  createdAt: string;
}

interface RequestsData {
  logs: RequestLog[];
  total: number;
  page: number;
  totalPages: number;
}

interface FeatureUsage {
  feature: string;
  _count: number;
  _sum: { tokensIn: number | null; tokensOut: number | null; costUsd: number | null };
  lastUsed: string | null;
}

interface ProjectInfo {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: { documents: number };
}

interface ActivityEntry {
  id: string;
  projectId: string;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

interface ActivityData {
  activities: ActivityEntry[];
  total: number;
  page: number;
  totalPages: number;
}

// --- Constants ---

const TABS = [
  { id: "overview", label: "Обзор" },
  { id: "requests", label: "AI Запросы" },
  { id: "features", label: "Функции" },
  { id: "projects", label: "Проекты" },
  { id: "activity", label: "Активность" },
] as const;

const FEATURE_LABELS: Record<string, string> = {
  chat: "Чат",
  rewrite: "Перезапись",
  format: "Форматирование",
  "dialogue-pass": "Dialogue Pass",
  analysis: "Анализ сцены",
  "character-analysis": "Анализ персонажей",
  "structure-analysis": "Анализ структуры",
  "consistency-check": "Проверка логики",
  "beat-sheet": "Beat Sheet",
  "pacing-analysis": "Анализ ритма",
  logline: "Логлайн",
  synopsis: "Синопсис",
  "describe-character": "Описание персонажа",
  "describe-location": "Описание локации",
  "knowledge-graph": "Граф знаний",
  "scene-synopsis": "Синопсис сцены",
  "act-assignment": "Распределение актов",
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
  gemini: "Gemini",
  yandex: "Yandex",
  grok: "Grok",
};

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// --- Component ---

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<string>("overview");
  const [sectionData, setSectionData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination for requests and activity
  const [reqPage, setReqPage] = useState(1);
  const [reqFeature, setReqFeature] = useState("");
  const [reqProvider, setReqProvider] = useState("");
  const [actPage, setActPage] = useState(1);

  const fetchSection = useCallback(async (section: string, extra?: Record<string, string>) => {
    setLoading(true);
    setSectionData(null);
    try {
      const params = new URLSearchParams({ section, ...extra });
      const res = await fetch(`/api/admin/users/${id}?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setUser(json.user);
      setSectionData(json.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Change tab: reset state synchronously before re-render
  function changeTab(newTab: string) {
    if (newTab === tab) return;
    setSectionData(null);
    setLoading(true);
    setTab(newTab);
  }

  // Load data on tab or pagination change
  useEffect(() => {
    const extra: Record<string, string> = {};
    if (tab === "requests") {
      extra.page = String(reqPage);
      if (reqFeature) extra.feature = reqFeature;
      if (reqProvider) extra.provider = reqProvider;
    } else if (tab === "activity") {
      extra.page = String(actPage);
    }
    fetchSection(tab, extra);
  }, [tab, reqPage, reqFeature, reqProvider, actPage, fetchSection]);

  // Reset pagination on filter change
  useEffect(() => { setReqPage(1); }, [reqFeature, reqProvider]);

  async function toggleField(field: "betaApproved" | "banned", value: boolean) {
    if (field === "banned" && value && !confirm("Заблокировать пользователя?")) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-csrf-check": "1" },
        body: JSON.stringify({ userId: id, [field]: value }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUser((prev) => prev ? { ...prev, [field]: value } : prev);
      toast.success(
        field === "banned"
          ? (value ? "Пользователь заблокирован" : "Пользователь разблокирован")
          : (value ? "Бета-доступ включён" : "Бета-доступ отключён"),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка обновления");
    }
  }

  async function deleteUser() {
    if (!user) return;
    if (!confirm(`Удалить пользователя ${user.name} (${user.email})?\n\nВсе данные будут удалены безвозвратно.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE", headers: { "x-csrf-check": "1" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Пользователь удалён");
      router.push("/users");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка удаления");
      setDeleting(false);
    }
  }

  if (!user && loading) {
    return <p className="text-muted-foreground">Загрузка...</p>;
  }

  if (!user) {
    return (
      <div>
        <a href="/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft size={16} /> Назад
        </a>
        <div className="admin-card p-6 text-center text-red-400">Пользователь не найден</div>
      </div>
    );
  }

  return (
    <div>
      {/* Back */}
      <a href="/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={16} /> Назад к списку
      </a>

      {/* Header Card */}
      <div className="admin-card mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold mb-1">{user.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Mail size={14} /> {user.email}</span>
              <span className="inline-flex items-center gap-1">
                <Calendar size={14} /> {new Date(user.createdAt).toLocaleDateString("ru")}
              </span>
              {user.telegramChatId && (
                <span className="inline-flex items-center gap-1"><Send size={14} /> TG: {user.telegramChatId}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {user.emailVerified && (
                <span className="text-xs px-2 py-0.5 rounded bg-green-500/15 text-green-400">Email подтверждён</span>
              )}
              {user.betaApproved && (
                <span className="text-xs px-2 py-0.5 rounded bg-accent/15 text-accent">Бета-доступ</span>
              )}
              {user.banned && (
                <span className="text-xs px-2 py-0.5 rounded bg-red-500/15 text-red-400">Заблокирован</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Shield size={16} className="text-accent" />
              <span>Бета</span>
              <button
                onClick={() => toggleField("betaApproved", !user.betaApproved)}
                className={`toggle ${user.betaApproved ? "active" : ""}`}
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ShieldOff size={16} className="text-red-400" />
              <span>Бан</span>
              <button
                onClick={() => toggleField("banned", !user.banned)}
                className={`toggle ban ${user.banned ? "active" : ""}`}
              />
            </div>
            <button
              onClick={deleteUser}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
              {deleting ? "Удаление..." : "Удалить"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => changeTab(t.id)}
            className={`admin-tab ${tab === t.id ? "active" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <p className="text-muted-foreground text-sm">Загрузка...</p>}

      {/* Tab Content */}
      {!loading && tab === "overview" && <OverviewTab data={sectionData as OverviewData} />}
      {!loading && tab === "requests" && (
        <RequestsTab
          data={sectionData as RequestsData}
          feature={reqFeature}
          provider={reqProvider}
          onFeatureChange={setReqFeature}
          onProviderChange={setReqProvider}
          onPageChange={setReqPage}
        />
      )}
      {!loading && tab === "features" && <FeaturesTab data={sectionData as FeatureUsage[]} />}
      {!loading && tab === "projects" && <ProjectsTab data={sectionData as ProjectInfo[]} />}
      {!loading && tab === "activity" && (
        <ActivityTab data={sectionData as ActivityData} onPageChange={setActPage} />
      )}
    </div>
  );
}

// --- Tab Components ---

function OverviewTab({ data }: { data: OverviewData | null }) {
  if (!data) return null;
  const { usageStats, errorCount, projectCount } = data;
  const cards = [
    { label: "AI запросы", value: fmtNum(usageStats._count) },
    { label: "Токены (вход)", value: fmtNum(usageStats._sum.tokensIn || 0) },
    { label: "Токены (выход)", value: fmtNum(usageStats._sum.tokensOut || 0) },
    { label: "Стоимость", value: `$${(usageStats._sum.costUsd || 0).toFixed(2)}` },
    { label: "Ошибки", value: String(errorCount) },
    { label: "Проекты", value: String(projectCount) },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="admin-card text-center">
          <div className="text-2xl font-semibold">{c.value}</div>
          <div className="text-sm text-muted-foreground mt-1">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

function RequestsTab({
  data,
  feature,
  provider,
  onFeatureChange,
  onProviderChange,
  onPageChange,
}: {
  data: RequestsData | null;
  feature: string;
  provider: string;
  onFeatureChange: (v: string) => void;
  onProviderChange: (v: string) => void;
  onPageChange: (p: number) => void;
}) {
  if (!data) return null;
  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="admin-input w-auto"
          value={feature}
          onChange={(e) => onFeatureChange(e.target.value)}
        >
          <option value="">Все функции</option>
          {Object.entries(FEATURE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          className="admin-input w-auto"
          value={provider}
          onChange={(e) => onProviderChange(e.target.value)}
        >
          <option value="">Все провайдеры</option>
          {Object.entries(PROVIDER_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground self-center">
          {data.total} записей
        </span>
      </div>

      <div className="admin-card overflow-x-auto p-0">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Функция</th>
              <th>Провайдер</th>
              <th>Модель</th>
              <th>Токены</th>
              <th>Стоимость</th>
              <th>Время</th>
            </tr>
          </thead>
          <tbody>
            {data.logs.map((l) => (
              <tr key={l.id}>
                <td className="text-muted-foreground whitespace-nowrap">
                  {new Date(l.createdAt).toLocaleString("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td>{FEATURE_LABELS[l.feature] || l.feature}</td>
                <td>{PROVIDER_LABELS[l.provider] || l.provider}</td>
                <td className="text-muted-foreground font-mono text-xs">{l.model}</td>
                <td className="whitespace-nowrap">{fmtNum(l.tokensIn)} / {fmtNum(l.tokensOut)}</td>
                <td>${l.costUsd.toFixed(3)}</td>
                <td className="text-muted-foreground">{l.durationMs ? `${(l.durationMs / 1000).toFixed(1)}s` : "—"}</td>
              </tr>
            ))}
            {data.logs.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-6">Нет данных</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <Pagination page={data.page} totalPages={data.totalPages} onChange={onPageChange} />
      )}
    </div>
  );
}

function FeaturesTab({ data }: { data: FeatureUsage[] | null }) {
  if (!data) return null;
  return (
    <div className="admin-card overflow-x-auto p-0">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Функция</th>
            <th>Запросы</th>
            <th>Токены (вход)</th>
            <th>Токены (выход)</th>
            <th>Стоимость</th>
            <th>Последнее</th>
          </tr>
        </thead>
        <tbody>
          {data.map((f) => (
            <tr key={f.feature}>
              <td className="font-medium">{FEATURE_LABELS[f.feature] || f.feature}</td>
              <td>{f._count}</td>
              <td>{fmtNum(f._sum.tokensIn || 0)}</td>
              <td>{fmtNum(f._sum.tokensOut || 0)}</td>
              <td>${(f._sum.costUsd || 0).toFixed(3)}</td>
              <td className="text-muted-foreground">
                {f.lastUsed ? new Date(f.lastUsed).toLocaleDateString("ru") : "—"}
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center text-muted-foreground py-6">Нет данных</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ProjectsTab({ data }: { data: ProjectInfo[] | null }) {
  if (!data) return null;
  return (
    <div className="admin-card overflow-x-auto p-0">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Тип</th>
            <th>Статус</th>
            <th>Документы</th>
            <th>Создан</th>
            <th>Обновлён</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.id}>
              <td className="font-medium">{p.title}</td>
              <td className="text-muted-foreground">{p.type}</td>
              <td className="text-muted-foreground">{p.status}</td>
              <td>{p._count.documents}</td>
              <td className="text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("ru")}</td>
              <td className="text-muted-foreground">{new Date(p.updatedAt).toLocaleDateString("ru")}</td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center text-muted-foreground py-6">Нет проектов</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ActivityTab({ data, onPageChange }: { data: ActivityData | null; onPageChange: (p: number) => void }) {
  if (!data) return null;
  return (
    <div>
      <div className="space-y-2">
        {data.activities.map((a) => (
          <div key={a.id} className="admin-card flex items-start gap-3 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{a.action}</span>
                <span className="text-muted-foreground">
                  {new Date(a.createdAt).toLocaleString("ru", {
                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
              {a.details && (
                <pre className="text-xs text-muted-foreground mt-1 overflow-x-auto max-w-full">
                  {JSON.stringify(a.details, null, 2).slice(0, 200)}
                </pre>
              )}
            </div>
          </div>
        ))}
        {data.activities.length === 0 && (
          <div className="admin-card text-center text-muted-foreground py-6">Нет активности</div>
        )}
      </div>

      {data.totalPages > 1 && (
        <Pagination page={data.page} totalPages={data.totalPages} onChange={onPageChange} />
      )}
    </div>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between mt-4">
      <span className="text-sm text-muted-foreground">Стр. {page} из {totalPages}</span>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="admin-btn-sm disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="admin-btn-sm disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
