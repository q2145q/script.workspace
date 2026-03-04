"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Key, Check, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LANGUAGES, PROVIDER_MODELS, PROJECT_STATUS_LABELS, type ProjectStatus } from "@script/types";

interface ProjectSettingsFormProps {
  project: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    language: string;
    status: string;
  };
  projectId: string;
}

const PROJECT_TYPES = [
  { value: "FEATURE_FILM", label: "Feature Film" },
  { value: "TV_SERIES", label: "TV Series" },
  { value: "SHORT_FILM", label: "Short Film" },
  { value: "OTHER", label: "Other" },
];

const PROVIDERS = [
  { id: "openai" as const, name: "OpenAI", defaultModel: "gpt-4.1", placeholder: "sk-..." },
  { id: "anthropic" as const, name: "Anthropic", defaultModel: "claude-sonnet-4-6", placeholder: "sk-ant-..." },
];

export function ProjectSettingsForm({ project, projectId }: ProjectSettingsFormProps) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [type, setType] = useState(project.type);
  const [language, setLanguage] = useState(project.language);
  const [status, setStatus] = useState(project.status);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const updateMutation = useMutation(
    trpc.project.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.project.getById.queryKey({ id: projectId }) });
        toast.success("Settings saved");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const handleSave = () => {
    updateMutation.mutate({
      id: projectId,
      title: title.trim() || project.title,
      description: description.trim() || undefined,
      type: type as "FEATURE_FILM" | "TV_SERIES" | "SHORT_FILM" | "OTHER",
      language,
      status: status as ProjectStatus,
    });
  };

  const inputClass = "w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
  const labelClass = "mb-1.5 block text-xs font-medium text-muted-foreground";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <Link
          href={`/project/${projectId}`}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Project Settings</h1>
          <p className="text-xs text-muted-foreground">{project.title}</p>
        </div>
      </div>

      {/* General */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold text-foreground">General</h2>
        <div className="space-y-4 rounded-xl border border-border bg-muted/10 p-4">
          <div>
            <label className={labelClass}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputClass + " resize-none"}
              placeholder="Optional description..."
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={inputClass}
              >
                {PROJECT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputClass}
              >
                {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={inputClass}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-ai-accent px-4 py-2 text-sm font-medium text-ai-accent-foreground transition-all hover:opacity-90 disabled:opacity-50"
          >
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </section>

      {/* AI Providers */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold text-foreground">AI Providers</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Add your API keys to enable AI features. Keys are encrypted at rest.
        </p>
        <div className="space-y-3">
          {PROVIDERS.map((provider) => (
            <ProviderCard key={provider.id} projectId={projectId} provider={provider} />
          ))}
        </div>
      </section>
    </motion.div>
  );
}

function ProviderCard({
  projectId,
  provider,
}: {
  projectId: string;
  provider: { id: "openai" | "anthropic"; name: string; defaultModel: string; placeholder: string };
}) {
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState(provider.defaultModel);
  const [editing, setEditing] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const models = PROVIDER_MODELS[provider.id];

  const { data: providers } = useQuery(
    trpc.provider.list.queryOptions({ projectId })
  );

  const existing = providers?.find((p) => p.provider === provider.id);

  const configureMutation = useMutation(
    trpc.provider.configure.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.provider.list.queryKey({ projectId }) });
        toast.success(`${provider.name} configured`);
        setEditing(false);
        setApiKey("");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const updateModelMutation = useMutation(
    trpc.provider.updateModel.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.provider.list.queryKey({ projectId }) });
        toast.success("Model updated");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const removeMutation = useMutation(
    trpc.provider.remove.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.provider.list.queryKey({ projectId }) });
        toast.success(`${provider.name} removed`);
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const inputClass = "w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="rounded-xl border border-border bg-muted/10 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-ai-accent" />
          <span className="text-sm font-medium text-foreground">{provider.name}</span>
        </div>
        {existing && !editing && (
          <div className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs text-muted-foreground">{existing.maskedKey}</span>
          </div>
        )}
      </div>

      {existing && !editing ? (
        <div className="mt-3 space-y-3">
          {/* Model selector */}
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Model</label>
            <select
              value={existing.model}
              onChange={(e) => {
                updateModelMutation.mutate({
                  projectId,
                  provider: provider.id,
                  model: e.target.value,
                });
              }}
              disabled={updateModelMutation.isPending}
              className={inputClass}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.description}
                </option>
              ))}
              {/* Show current model even if not in our list */}
              {!models.some((m) => m.id === existing.model) && (
                <option value={existing.model}>{existing.model}</option>
              )}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded-md px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Update Key
            </button>
            <button
              onClick={() => removeMutation.mutate({ projectId, provider: provider.id })}
              disabled={removeMutation.isPending}
              className="flex items-center gap-1 rounded-md px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={provider.placeholder}
            className={inputClass}
          />
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className={inputClass}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.description}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                configureMutation.mutate({
                  projectId,
                  provider: provider.id,
                  apiKey,
                  model: selectedModel,
                })
              }
              disabled={!apiKey.trim() || configureMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-ai-accent px-3 py-1.5 text-xs font-medium text-ai-accent-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {configureMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Save Key
            </button>
            {editing && (
              <button
                onClick={() => { setEditing(false); setApiKey(""); }}
                className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
