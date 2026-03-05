"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, X, Loader2 } from "lucide-react";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ProviderSettingsProps {
  projectId: string;
}

export function ProviderSettings({ projectId }: ProviderSettingsProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md p-1.5 text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
        title="AI Model Settings"
      >
        <Cpu className="h-3.5 w-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="glass-panel fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">AI Model</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mb-4 text-xs text-muted-foreground">
                Select a default AI model for this project.
              </p>

              <ModelSelector projectId={projectId} onSaved={() => setOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function ModelSelector({
  projectId,
  onSaved,
}: {
  projectId: string;
  onSaved: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: availableModels } = useQuery(
    trpc.provider.availableModels.queryOptions()
  );

  // We need the current project settings to show selected values
  const { data: projectData } = useQuery(
    trpc.project.getById.queryOptions({ id: projectId })
  );

  const project = projectData as { preferredProvider?: string | null; preferredModel?: string | null } | undefined;
  const [provider, setProvider] = useState(project?.preferredProvider ?? "");
  const [model, setModel] = useState(project?.preferredModel ?? "");

  const updateMutation = useMutation(
    trpc.provider.updateModel.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.project.getById.queryKey({ id: projectId }) });
        toast.success("Model updated");
        onSaved();
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const currentProviderModels = availableModels?.find(
    (p) => p.provider === provider
  )?.models ?? [];

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const models = availableModels?.find((p) => p.provider === newProvider)?.models ?? [];
    setModel(models[0]?.id ?? "");
  };

  const inputClass = "w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring";

  if (!availableModels || availableModels.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No AI providers available. Contact administrator.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Provider</label>
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className={inputClass}
        >
          <option value="">Auto (default)</option>
          {availableModels.map((p) => (
            <option key={p.provider} value={p.provider}>
              {p.provider.charAt(0).toUpperCase() + p.provider.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {provider && currentProviderModels.length > 0 && (
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={inputClass}
          >
            {currentProviderModels.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
      )}

      <button
        onClick={() =>
          updateMutation.mutate({
            projectId,
            preferredProvider: provider || null,
            preferredModel: model || null,
          })
        }
        disabled={updateMutation.isPending}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-ai-accent px-3 py-2 text-sm font-medium text-ai-accent-foreground transition-all hover:opacity-90 disabled:opacity-50"
      >
        {updateMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Save
      </button>
    </div>
  );
}
