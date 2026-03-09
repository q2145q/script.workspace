"use client";

import { useMemo, useState } from "react";
import { ScriptEditor, HocuspocusProvider } from "@script/editor";
import type { CollaborationConfig } from "@script/editor";
import { BookOpen, ArrowRight, Loader2 } from "lucide-react";
import { OnlineUsers } from "./online-users";
import { CollabStatus } from "./collab-status";
import { BibleSections } from "./bible-sections";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { CurrentUser } from "./workspace-shell";

// Deterministic color from user ID
function hashToColor(str: string): string {
  const colors = [
    "#E57373", "#F06292", "#BA68C8", "#9575CD",
    "#7986CB", "#64B5F6", "#4FC3F7", "#4DD0E1",
    "#4DB6AC", "#81C784", "#AED581", "#FFD54F",
    "#FFB74D", "#FF8A65", "#A1887F", "#90A4AE",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/** Check if a TipTap JSON content object has actual text */
function hasContent(content: unknown): boolean {
  if (!content || typeof content !== "object") return false;
  const node = content as Record<string, unknown>;
  if (node.type === "text" && typeof node.text === "string" && node.text.trim()) return true;
  if (Array.isArray(node.content)) {
    return (node.content as unknown[]).some(hasContent);
  }
  return false;
}

interface BibleEditorProps {
  projectId: string;
  currentUser: CurrentUser;
}

export function BibleEditor({ projectId, currentUser }: BibleEditorProps) {
  const t = useTranslations("Bible");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [collabProvider, setCollabProvider] = useState<HocuspocusProvider | null>(null);

  // Load bible with sections
  const { data: bible, isLoading } = useQuery(
    trpc.bible.get.queryOptions({ projectId })
  );

  const convertMutation = useMutation(
    trpc.bible.convertToSections.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.bible.get.queryKey({ projectId }) });
        queryClient.invalidateQueries({ queryKey: trpc.bible.listSections.queryKey({ projectId }) });
      },
    })
  );

  const hasSections = bible?.sections && bible.sections.length > 0;
  const hasLegacyContent = bible ? hasContent(bible.content) : false;

  const collabConfig: CollaborationConfig = useMemo(() => {
    let wsUrl = process.env.NEXT_PUBLIC_COLLAB_WS_URL || "";
    if (!wsUrl && typeof window !== "undefined") {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${proto}//${window.location.hostname}:3004`;
    }
    if (!wsUrl) wsUrl = "ws://localhost:3004";

    return {
      documentName: `bible:${projectId}`,
      wsUrl,
      user: {
        id: currentUser.id,
        name: currentUser.name,
        color: hashToColor(currentUser.id),
      },
    };
  }, [projectId, currentUser]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  // If sections exist — show sections UI
  if (hasSections) {
    return <BibleSections projectId={projectId} />;
  }

  // If legacy content exists but no sections — show migration banner + legacy editor
  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header bar */}
      <div className="glass-panel flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-cinema" />
          <span className="text-sm font-medium text-foreground">
            {t("title")}
          </span>
          <OnlineUsers provider={collabProvider} />
        </div>
        <CollabStatus provider={collabProvider} />
      </div>

      {/* Migration banner */}
      {hasLegacyContent && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
              <BookOpen className="h-4 w-4" />
              <span>{t("migrationBanner")}</span>
            </div>
            <button
              onClick={() => convertMutation.mutate({ projectId })}
              disabled={convertMutation.isPending}
              className="flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
            >
              {convertMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ArrowRight className="h-3 w-3" />
              )}
              {t("convertToSections")}
            </button>
          </div>
        </div>
      )}

      {/* If no content at all — show empty state prompting section creation */}
      {!hasLegacyContent && (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
          <BookOpen className="h-12 w-12 opacity-30" />
          <div className="text-center">
            <p className="text-sm font-medium">{t("emptyBibleTitle")}</p>
            <p className="mt-1 text-xs">{t("emptyBibleDescription")}</p>
          </div>
          <button
            onClick={() => convertMutation.mutate({ projectId })}
            disabled={convertMutation.isPending}
            className="flex items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            {convertMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <BookOpen className="h-3 w-3" />
            )}
            {t("createDefaultSections")}
          </button>
        </div>
      )}

      {/* Legacy editor content — only show if there's legacy content */}
      {hasLegacyContent && (
        <div className="flex-1 overflow-y-auto">
          <ScriptEditor
            key="bible"
            collaboration={collabConfig}
            onCollabProvider={setCollabProvider}
            hideToolbar={false}
          />
        </div>
      )}
    </div>
  );
}
