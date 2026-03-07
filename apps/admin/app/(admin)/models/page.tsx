"use client";

import { useState, useEffect, useCallback } from "react";

interface ModelConfig {
  id: string;
  provider: string;
  modelId: string;
  modelLabel: string;
  isEnabled: boolean;
  costInputPerMillion: number;
  costOutputPerMillion: number;
  sortOrder: number;
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
  gemini: "Google Gemini",
  yandex: "Yandex GPT",
  grok: "Grok (xAI)",
};

export default function ModelsPage() {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    const res = await fetch("/api/admin/models");
    if (res.ok) setModels(await res.json());
  }, []);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  async function updateModel(id: string, updates: Partial<ModelConfig>) {
    setSaving(id);
    await fetch("/api/admin/models", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-csrf-check": "1" },
      body: JSON.stringify({ id, ...updates }),
    });
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
    setSaving(null);
  }

  // Group by provider
  const grouped = models.reduce<Record<string, ModelConfig[]>>((acc, m) => {
    (acc[m.provider] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Модели</h1>

      {Object.entries(grouped).map(([provider, providerModels]) => (
        <div key={provider} className="mb-8">
          <h2 className="text-lg font-medium mb-3 text-accent">
            {PROVIDER_LABELS[provider] || provider}
          </h2>
          <div className="admin-card overflow-x-auto p-0">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Модель</th>
                  <th>ID</th>
                  <th>Вкл</th>
                  <th>Вход $/1M</th>
                  <th>Выход $/1M</th>
                </tr>
              </thead>
              <tbody>
                {providerModels.map((m) => (
                  <tr key={m.id}>
                    <td className="font-medium">{m.modelLabel}</td>
                    <td className="text-muted-foreground font-mono text-xs">{m.modelId}</td>
                    <td>
                      <button
                        onClick={() => updateModel(m.id, { isEnabled: !m.isEnabled })}
                        className={`toggle ${m.isEnabled ? "active" : ""}`}
                        disabled={saving === m.id}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="admin-input w-24"
                        value={m.costInputPerMillion}
                        onChange={(e) =>
                          setModels((prev) =>
                            prev.map((x) =>
                              x.id === m.id
                                ? { ...x, costInputPerMillion: Number(e.target.value) }
                                : x
                            )
                          )
                        }
                        onBlur={(e) =>
                          updateModel(m.id, { costInputPerMillion: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="admin-input w-24"
                        value={m.costOutputPerMillion}
                        onChange={(e) =>
                          setModels((prev) =>
                            prev.map((x) =>
                              x.id === m.id
                                ? { ...x, costOutputPerMillion: Number(e.target.value) }
                                : x
                            )
                          )
                        }
                        onBlur={(e) =>
                          updateModel(m.id, { costOutputPerMillion: Number(e.target.value) })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {models.length === 0 && (
        <p className="text-muted-foreground">Загрузка моделей...</p>
      )}
    </div>
  );
}
