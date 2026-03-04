"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Key, Check, X, Loader2 } from "lucide-react";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ProviderSettingsProps {
  projectId: string;
}

const PROVIDERS = [
  { id: "openai" as const, name: "OpenAI", defaultModel: "gpt-4o", placeholder: "sk-..." },
  { id: "anthropic" as const, name: "Anthropic", defaultModel: "claude-sonnet-4-20250514", placeholder: "sk-ant-..." },
];

export function ProviderSettings({ projectId }: ProviderSettingsProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md p-1.5 text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
        title="AI Provider Settings"
      >
        <Settings className="h-3.5 w-3.5" />
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
              className="glass-panel fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">AI Providers</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mb-4 text-xs text-muted-foreground">
                Add your API keys to enable AI features. Keys are encrypted at rest.
              </p>

              <div className="space-y-4">
                {PROVIDERS.map((provider) => (
                  <ProviderCard
                    key={provider.id}
                    projectId={projectId}
                    provider={provider}
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
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
  const [editing, setEditing] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: providers } = useQuery(
    trpc.provider.list.queryOptions({ projectId })
  );

  const existing = providers?.find((p) => p.provider === provider.id);

  const configureMutation = useMutation(
    trpc.provider.configure.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.provider.list.queryKey({ projectId }),
        });
        toast.success(`${provider.name} configured`);
        setEditing(false);
        setApiKey("");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const removeMutation = useMutation(
    trpc.provider.remove.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.provider.list.queryKey({ projectId }),
        });
        toast.success(`${provider.name} removed`);
      },
      onError: (err) => toast.error(err.message),
    })
  );

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="h-3.5 w-3.5 text-ai-accent" />
          <span className="text-sm font-medium text-foreground">{provider.name}</span>
        </div>
        {existing && !editing && (
          <div className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-green-500" />
            <span className="text-[10px] text-muted-foreground">{existing.maskedKey}</span>
          </div>
        )}
      </div>

      {existing && !editing ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Model: {existing.model}</span>
          <div className="ml-auto flex gap-1">
            <button
              onClick={() => setEditing(true)}
              className="rounded px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Update
            </button>
            <button
              onClick={() => removeMutation.mutate({ projectId, provider: provider.id })}
              disabled={removeMutation.isPending}
              className="rounded px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={provider.placeholder}
            className="w-full rounded-md border border-border bg-muted/50 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex gap-1.5">
            <button
              onClick={() =>
                configureMutation.mutate({
                  projectId,
                  provider: provider.id,
                  apiKey,
                  model: provider.defaultModel,
                })
              }
              disabled={!apiKey.trim() || configureMutation.isPending}
              className="flex items-center gap-1 rounded-md bg-ai-accent px-2.5 py-1 text-[10px] font-medium text-ai-accent-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {configureMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Save
            </button>
            {editing && (
              <button
                onClick={() => {
                  setEditing(false);
                  setApiKey("");
                }}
                className="rounded-md px-2.5 py-1 text-[10px] text-muted-foreground hover:text-foreground"
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
