"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { ScriptEditor, EditorToolbar, useEditorAutosave, useScriptStats, type JSONContent, type Editor, HocuspocusProvider } from "@script/editor";
import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Loader2, Check, AlertCircle, HelpCircle, Printer } from "lucide-react";
import { SelectionToolbar } from "./selection-toolbar";
import { ExportDialog } from "./export-dialog";
import { OnlineUsers } from "./online-users";
import { CollabStatus } from "./collab-status";
import { CommentPopover } from "./comment-popover";
import { SuggestionPopover } from "./suggestion-popover";
import { ShortcutsModal } from "./shortcuts-modal";
import { ScriptStatsFooter } from "./script-stats-footer";
import { SearchPanel } from "./search-panel";
import { ImportDialog } from "./import-dialog";
import { PrintPreviewModal } from "./print-preview-modal";
import type { CurrentUser } from "./workspace-shell";
import type { CollaborationConfig } from "@script/editor";

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

interface EditorAreaProps {
  document: {
    id: string;
    title: string;
    content: unknown;
  };
  projectTitle: string;
  projectId: string;
  onEditorReady?: (editor: Editor) => void;
  currentUser: CurrentUser;
}

function SaveDraftButton({ documentId }: { documentId: string }) {
  const t = useTranslations("Editor");
  const tVersions = useTranslations("Versions");
  const trpc = useTRPC();
  const draftMutation = useMutation(
    trpc.draft.create.mutationOptions({
      onSuccess: () => toast.success(tVersions("draftSaved")),
      onError: (err) => toast.error(err.message),
    })
  );

  return (
    <button
      onClick={() => draftMutation.mutate({ documentId })}
      disabled={draftMutation.isPending}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-ai-accent/10 hover:text-ai-accent disabled:opacity-50"
      title={t("saveDraft")}
    >
      <Save className="h-3 w-3" />
      {t("draft")}
    </button>
  );
}

function AutosaveIndicator({ saveState }: { saveState: import("@script/editor").SaveState }) {
  const t = useTranslations("Editor");

  if (saveState === "saving") {
    return (
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t("saving")}
      </span>
    );
  }

  if (saveState === "saved") {
    return (
      <span className="flex items-center gap-1 text-[10px] text-emerald-500">
        <Check className="h-3 w-3" />
        {t("saved")}
      </span>
    );
  }

  if (saveState === "error") {
    return (
      <span className="flex items-center gap-1 text-[10px] text-red-500">
        <AlertCircle className="h-3 w-3" />
        {t("saveError")}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
      <Save className="h-3 w-3" />
      {t("autoSave")}
    </span>
  );
}

export function EditorArea({ document, projectTitle, projectId, onEditorReady, currentUser }: EditorAreaProps) {
  const t = useTranslations("Editor");
  const trpc = useTRPC();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [collabProvider, setCollabProvider] = useState<HocuspocusProvider | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const stats = useScriptStats(editor);
  const documentIdRef = useRef(document.id);
  documentIdRef.current = document.id;

  // Only use collab if NEXT_PUBLIC_COLLAB_WS_URL is explicitly set
  const collabWsUrl = process.env.NEXT_PUBLIC_COLLAB_WS_URL || "";
  const useCollab = !!collabWsUrl;

  const collabConfig: CollaborationConfig | undefined = useMemo(() => {
    if (!useCollab) return undefined;

    return {
      documentName: `document:${document.id}`,
      wsUrl: collabWsUrl,
      user: {
        id: currentUser.id,
        name: currentUser.name,
        color: hashToColor(currentUser.id),
      },
    };
  }, [document.id, currentUser, useCollab, collabWsUrl]);

  // Direct-save mutation (used when collab is off)
  const saveMutation = useMutation(
    trpc.document.save.mutationOptions({
      onError: (err) => console.error("Autosave failed:", err.message),
    })
  );

  // Stable ref to avoid recreating autosave on each render
  const saveFnRef = useRef(saveMutation.mutateAsync);
  saveFnRef.current = saveMutation.mutateAsync;

  const { handleUpdate: handleAutosave, saveState } = useEditorAutosave(
    useCallback(async (content: JSONContent) => {
      await saveFnRef.current({ id: documentIdRef.current, content });
    }, []),
    2000
  );

  const handleEditorReady = useCallback(
    (ed: Editor) => {
      setEditor(ed);
      onEditorReady?.(ed);
    },
    [onEditorReady]
  );

  // When collab is off, use onUpdate for autosave
  const handleUpdate = useCallback(
    (content: JSONContent) => {
      if (!useCollab) {
        handleAutosave(content);
      }
    },
    [useCollab, handleAutosave]
  );

  // Cmd+/ to toggle shortcuts modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header bar with glass effect */}
      <div className="glass-panel flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">{document.title}</span>
          {useCollab && <OnlineUsers provider={collabProvider} />}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShortcutsOpen(true)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Cmd+/"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setPrintPreviewOpen(true)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={t("printPreview")}
          >
            <Printer className="h-3.5 w-3.5" />
          </button>
          <ImportDialog editor={editor} />
          <SaveDraftButton documentId={document.id} />
          <ExportDialog documentId={document.id} projectTitle={projectTitle} />
          {useCollab ? (
            <CollabStatus provider={collabProvider} />
          ) : (
            <AutosaveIndicator saveState={saveState} />
          )}
        </div>
      </div>

      {/* Toolbar with glass effect */}
      {editor && (
        <div className="glass-panel border-b border-border">
          <EditorToolbar editor={editor} />
        </div>
      )}

      {/* Find & Replace panel */}
      {editor && searchOpen && (
        <SearchPanel editor={editor} onClose={() => setSearchOpen(false)} />
      )}

      {/* Editor content — focused writing area */}
      <div className="flex-1 overflow-y-auto">
        <ScriptEditor
          content={!useCollab ? (document.content as JSONContent) : undefined}
          collaboration={collabConfig}
          onUpdate={handleUpdate}
          onEditorReady={handleEditorReady}
          onCollabProvider={useCollab ? setCollabProvider : undefined}
          hideToolbar
        />
      </div>

      {/* Script statistics footer */}
      <ScriptStatsFooter stats={stats} />

      {/* Floating selection toolbar (Format / Rewrite / Pin) */}
      <SelectionToolbar editor={editor} documentId={document.id} projectId={projectId} />

      {/* Inline comment popover — appears when clicking on commented text */}
      <CommentPopover editor={editor} documentId={document.id} />

      {/* Inline suggestion popover — appears when clicking on AI rewrite decorations */}
      <SuggestionPopover editor={editor} documentId={document.id} />

      <ShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <PrintPreviewModal open={printPreviewOpen} onOpenChange={setPrintPreviewOpen} editor={editor} />
    </div>
  );
}
