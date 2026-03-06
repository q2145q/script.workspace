"use client";

import { useCallback, useMemo, useState, useRef } from "react";
import { ScriptEditor, EditorToolbar, useEditorState, useEditorAutosave, type JSONContent, type Editor, HocuspocusProvider } from "@script/editor";
import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pin, Save } from "lucide-react";
import { AICommandBar } from "./ai-command-bar";
import { ExportDialog } from "./export-dialog";
import { OnlineUsers } from "./online-users";
import { CollabStatus } from "./collab-status";
import { CommentPopover } from "./comment-popover";
import { SuggestionPopover } from "./suggestion-popover";
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

function PinButton({ editor, projectId }: { editor: Editor; projectId: string }) {
  const t = useTranslations("Editor");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const hasSelection = useEditorState({
    editor,
    selector: (ctx) => {
      const { from, to } = ctx.editor.state.selection;
      return to - from > 0;
    },
  });

  const pinMutation = useMutation(
    trpc.pin.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.pin.list.queryKey({ projectId }),
        });
        toast.success("Pinned to context");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const handlePin = () => {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ");
    if (!text.trim()) return;
    pinMutation.mutate({ projectId, content: text, type: "TEXT" });
  };

  if (!hasSelection) return null;

  return (
    <button
      onClick={handlePin}
      disabled={pinMutation.isPending}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-ai-accent/10 hover:text-ai-accent disabled:opacity-50"
      title={t("pinSelection")}
    >
      <Pin className="h-3 w-3" />
      {t("pin")}
    </button>
  );
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

function AutoSaveLabel() {
  const t = useTranslations("Editor");
  return (
    <span className="flex items-center gap-1 text-[10px] text-emerald-500" title={t("autoSaveTitle")}>
      <Save className="h-3 w-3" />
      {t("autoSave")}
    </span>
  );
}

export function EditorArea({ document, projectTitle, projectId, onEditorReady, currentUser }: EditorAreaProps) {
  const trpc = useTRPC();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [collabProvider, setCollabProvider] = useState<HocuspocusProvider | null>(null);
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

  const handleAutosave = useEditorAutosave(
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

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header bar with glass effect */}
      <div className="glass-panel flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">{document.title}</span>
          {useCollab && <OnlineUsers provider={collabProvider} />}
        </div>
        <div className="flex items-center gap-2">
          {editor && <PinButton editor={editor} projectId={projectId} />}
          <SaveDraftButton documentId={document.id} />
          <ExportDialog documentId={document.id} projectTitle={projectTitle} />
          {useCollab ? (
            <CollabStatus provider={collabProvider} />
          ) : (
            <AutoSaveLabel />
          )}
        </div>
      </div>

      {/* Toolbar with glass effect */}
      {editor && (
        <div className="glass-panel border-b border-border">
          <EditorToolbar editor={editor} />
        </div>
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

      {/* AI Command Bar (Cmd+K) */}
      <AICommandBar editor={editor} documentId={document.id} />

      {/* Inline comment popover — appears when clicking on commented text */}
      <CommentPopover editor={editor} documentId={document.id} />

      {/* Inline suggestion popover — appears when clicking on AI rewrite decorations */}
      <SuggestionPopover editor={editor} documentId={document.id} />
    </div>
  );
}
