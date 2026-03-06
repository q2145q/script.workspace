"use client";

import { useMemo, useState } from "react";
import { ScriptEditor, HocuspocusProvider } from "@script/editor";
import type { CollaborationConfig } from "@script/editor";
import { BookOpen } from "lucide-react";
import { OnlineUsers } from "./online-users";
import { CollabStatus } from "./collab-status";
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

interface BibleEditorProps {
  projectId: string;
  currentUser: CurrentUser;
}

export function BibleEditor({ projectId, currentUser }: BibleEditorProps) {
  const [collabProvider, setCollabProvider] = useState<HocuspocusProvider | null>(null);

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

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header bar */}
      <div className="glass-panel flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-ai-accent" />
          <span className="text-sm font-medium text-foreground">
            Project Bible
          </span>
          <OnlineUsers provider={collabProvider} />
        </div>
        <CollabStatus provider={collabProvider} />
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto">
        <ScriptEditor
          key="bible"
          collaboration={collabConfig}
          onCollabProvider={setCollabProvider}
          hideToolbar={false}
        />
      </div>
    </div>
  );
}
