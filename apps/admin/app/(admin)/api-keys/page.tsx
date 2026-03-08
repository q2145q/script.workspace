"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Key, Eye, EyeOff, Trash2 } from "lucide-react";

const PROVIDERS = [
  { id: "openai", name: "OpenAI", placeholder: "sk-..." },
  { id: "anthropic", name: "Anthropic", placeholder: "sk-ant-..." },
  { id: "deepseek", name: "DeepSeek", placeholder: "sk-..." },
  { id: "gemini", name: "Google Gemini", placeholder: "AIza..." },
  { id: "yandex", name: "Yandex GPT", placeholder: "Api-Key ..." },
  { id: "grok", name: "Grok (xAI)", placeholder: "xai-..." },
];

interface StoredKey {
  id: string;
  provider: string;
  isActive: boolean;
  maskedKey: string;
  updatedAt: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<StoredKey[]>([]);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/keys");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setKeys(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки ключей");
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  async function saveKey(provider: string) {
    if (!newKey.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-check": "1" },
        body: JSON.stringify({ provider, apiKey: newKey }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNewKey("");
      setEditingProvider(null);
      setShowKey(false);
      await fetchKeys();
      toast.success("Ключ сохранён");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка сохранения ключа");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(provider: string, isActive: boolean) {
    try {
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-check": "1" },
        body: JSON.stringify({ provider, isActive }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchKeys();
      toast.success(isActive ? "Ключ активирован" : "Ключ отключён");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка переключения");
    }
  }

  async function deleteKey(provider: string) {
    if (!confirm("Удалить ключ?")) return;
    try {
      const res = await fetch("/api/admin/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-csrf-check": "1" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchKeys();
      toast.success("Ключ удалён");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка удаления ключа");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">API Ключи</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Закрыть</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROVIDERS.map((p) => {
          const stored = keys.find((k) => k.provider === p.id);
          const isEditing = editingProvider === p.id;

          return (
            <div key={p.id} className="admin-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Key size={18} className="text-accent" />
                  <h3 className="font-medium">{p.name}</h3>
                </div>
                {stored && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(p.id, !stored.isActive)}
                      className={`toggle ${stored.isActive ? "active" : ""}`}
                      title={stored.isActive ? "Активен" : "Отключён"}
                    />
                    <button
                      onClick={() => deleteKey(p.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {stored && !isEditing && (
                <div>
                  <p className="text-sm text-muted-foreground font-mono">{stored.maskedKey}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Обновлён: {new Date(stored.updatedAt).toLocaleDateString("ru")}
                  </p>
                  <button
                    onClick={() => { setEditingProvider(p.id); setNewKey(""); }}
                    className="admin-btn-secondary admin-btn mt-3 text-xs"
                  >
                    Обновить ключ
                  </button>
                </div>
              )}

              {(!stored || isEditing) && (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      className="admin-input pr-10"
                      placeholder={p.placeholder}
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      onFocus={() => setEditingProvider(p.id)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveKey(p.id)}
                      className="admin-btn text-xs"
                      disabled={loading || !newKey.trim()}
                    >
                      {loading ? "Сохранение..." : "Сохранить"}
                    </button>
                    {isEditing && stored && (
                      <button
                        onClick={() => { setEditingProvider(null); setNewKey(""); }}
                        className="admin-btn admin-btn-secondary text-xs"
                      >
                        Отмена
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
