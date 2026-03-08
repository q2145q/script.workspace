"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ScriptEditor, useEditorAutosave, type JSONContent } from "@script/editor";
import { StickyNote, Plus, Trash2, Pencil, Check, X, Save, History, RotateCcw, Camera } from "lucide-react";
import { useAutoNoteRevision } from "@/hooks/use-auto-note-revision";
import type { Editor } from "@script/editor";
import type { CurrentUser } from "./workspace-shell";

interface NotesPanelProps {
  projectId: string;
  currentUser: CurrentUser;
}

export function NotesPanel({ projectId, currentUser }: NotesPanelProps) {
  const t = useTranslations("Notes");
  const tCommon = useTranslations("Common");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const { data: notes, isLoading } = useQuery(
    trpc.note.list.queryOptions({ projectId })
  );

  const createMutation = useMutation(
    trpc.note.create.mutationOptions({
      onSuccess: (note) => {
        queryClient.invalidateQueries({ queryKey: trpc.note.list.queryKey({ projectId }) });
        setSelectedNoteId(note.id);
        toast.success(t("noteCreated"));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const deleteMutation = useMutation(
    trpc.note.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.note.list.queryKey({ projectId }) });
        setSelectedNoteId(null);
        toast.success(t("noteDeleted"));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const selectedNote = notes?.find((n) => n.id === selectedNoteId);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="glass-panel flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-ai-accent" />
          <span className="text-sm font-medium text-foreground">{t("title")}</span>
        </div>
        <button
          onClick={() => createMutation.mutate({ projectId })}
          disabled={createMutation.isPending}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("new")}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Notes list sidebar */}
        <div className="w-48 shrink-0 overflow-y-auto border-r border-border bg-muted/20">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            </div>
          ) : notes && notes.length > 0 ? (
            <div className="space-y-0.5 p-1">
              {notes.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  isSelected={note.id === selectedNoteId}
                  onSelect={() => setSelectedNoteId(note.id)}
                  onDelete={() => {
                    if (confirm(t("deleteNote"))) {
                      deleteMutation.mutate({ id: note.id });
                    }
                  }}
                  projectId={projectId}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
              <StickyNote className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">{t("noNotes")}</p>
              <button
                onClick={() => createMutation.mutate({ projectId })}
                className="text-xs text-ai-accent hover:underline"
              >
                {t("createFirst")}
              </button>
            </div>
          )}
        </div>

        {/* Note editor */}
        <div className="flex-1 overflow-y-auto">
          {selectedNote ? (
            <NoteEditor
              noteId={selectedNote.id}
              projectId={projectId}
              currentUser={currentUser}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {notes && notes.length > 0
                ? t("selectNote")
                : t("createToStart")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NoteListItem({
  note,
  isSelected,
  onSelect,
  onDelete,
  projectId,
}: {
  note: { id: string; title: string; updatedAt: Date };
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  projectId: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);

  const renameMutation = useMutation(
    trpc.note.updateTitle.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.note.list.queryKey({ projectId }) });
        setEditing(false);
      },
    })
  );

  if (editing) {
    return (
      <div className="flex items-center gap-1 rounded-md bg-accent p-1">
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") renameMutation.mutate({ id: note.id, title: editTitle });
            if (e.key === "Escape") setEditing(false);
          }}
          autoFocus
          className="flex-1 rounded bg-background px-1.5 py-0.5 text-xs focus:outline-none"
        />
        <button onClick={() => renameMutation.mutate({ id: note.id, title: editTitle })} className="text-muted-foreground hover:text-foreground">
          <Check className="h-3 w-3" />
        </button>
        <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onSelect}
      className={`group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
        isSelected
          ? "bg-accent text-accent-foreground"
          : "text-foreground hover:bg-accent/50"
      }`}
    >
      <span className="truncate">{note.title}</span>
      <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
        <span
          onClick={(e) => { e.stopPropagation(); setEditing(true); setEditTitle(note.title); }}
          className="rounded p-0.5 hover:bg-muted"
        >
          <Pencil className="h-2.5 w-2.5" />
        </span>
        <span
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="rounded p-0.5 hover:bg-destructive/20 hover:text-destructive"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </span>
      </span>
    </button>
  );
}

function NoteEditor({
  noteId,
  projectId,
}: {
  noteId: string;
  projectId: string;
  currentUser: CurrentUser;
}) {
  const t = useTranslations("Notes");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const noteIdRef = useRef(noteId);
  noteIdRef.current = noteId;

  // Auto-snapshot every 30 minutes
  useAutoNoteRevision(editorInstance, noteId);

  // Always load note content via tRPC (no collab for notes — they're simple text)
  // staleTime: 0 ensures fresh data when re-mounting (e.g. switching tabs and back)
  const { data: noteData, isLoading: noteLoading } = useQuery({
    ...trpc.note.getById.queryOptions({ id: noteId }),
    staleTime: 0,
  });

  // Direct-save for notes via autosave
  const saveMutation = useMutation(
    trpc.note.updateContent.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.note.list.queryKey({ projectId }) });
      },
      onError: (err) => {
        toast.error(t("failedSave"));
        console.error("Note autosave failed:", err.message);
      },
    })
  );

  const saveFnRef = useRef(saveMutation.mutateAsync);
  saveFnRef.current = saveMutation.mutateAsync;

  const { handleUpdate: handleAutosave, saveState } = useEditorAutosave(
    useCallback(async (content: JSONContent) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveFnRef.current({ id: noteIdRef.current, content: content as any });
    }, []),
    2000
  );

  if (noteLoading) {
    return (
      <div className="flex h-full items-center justify-center font-mono">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  const editorKey = `${noteId}-${noteData?.id ?? "new"}`;

  return (
    <div className="flex h-full flex-col font-mono">
      <div className="flex items-center justify-end gap-2 border-b border-border px-3 py-1">
        <span className={`flex items-center gap-1 text-[10px] ${
          saveState === "saving" ? "text-yellow-500" :
          saveState === "saved" ? "text-emerald-500" :
          saveState === "error" ? "text-red-500" :
          "text-muted-foreground"
        }`}>
          <Save className="h-3 w-3" />
          {saveState === "saving" ? t("autoSave") + "..." :
           saveState === "saved" ? t("autoSave") + " ✓" :
           saveState === "error" ? t("failedSave") :
           t("autoSave")}
        </span>
        <button
          onClick={() => setShowHistory((v) => !v)}
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition-colors ${
            showHistory
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          title={t("history")}
        >
          <History className="h-3 w-3" />
          {t("history")}
        </button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <ScriptEditor
            key={editorKey}
            content={noteData?.content as JSONContent ?? undefined}
            onUpdate={handleAutosave}
            onEditorReady={setEditorInstance}
            hideToolbar
            plainText
          />
        </div>
        {showHistory && (
          <NoteHistoryPanel noteId={noteId} />
        )}
      </div>
    </div>
  );
}

function NoteHistoryPanel({ noteId }: { noteId: string }) {
  const t = useTranslations("Notes");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    trpc.noteRevision.list.queryOptions({ noteId })
  );

  const createSnapshotMutation = useMutation(
    trpc.noteRevision.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.noteRevision.list.queryKey({ noteId }) });
        toast.success(t("snapshotCreated"));
      },
      onError: () => toast.error(t("snapshotFailed")),
    })
  );

  const restoreMutation = useMutation(
    trpc.noteRevision.restore.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.noteRevision.list.queryKey({ noteId }) });
        queryClient.invalidateQueries({ queryKey: trpc.note.getById.queryKey({ id: noteId }) });
        toast.success(t("restored"));
      },
      onError: () => toast.error(t("restoreFailed")),
    })
  );

  return (
    <div className="w-56 shrink-0 overflow-y-auto border-l border-border bg-muted/20">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {t("revisions")}
        </span>
        <button
          onClick={() => createSnapshotMutation.mutate({ noteId })}
          disabled={createSnapshotMutation.isPending}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title={t("createSnapshot")}
        >
          <Camera className="h-3 w-3" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-20 items-center justify-center">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      ) : data?.items && data.items.length > 0 ? (
        <div className="space-y-0.5 p-1">
          {data.items.map((rev) => (
            <div
              key={rev.id}
              className="group rounded-md px-2 py-1.5 text-xs hover:bg-accent/50"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">
                  #{rev.number}
                </span>
                <button
                  onClick={() => {
                    if (confirm(t("restoreConfirm"))) {
                      restoreMutation.mutate({ id: rev.id });
                    }
                  }}
                  disabled={restoreMutation.isPending}
                  className="rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                  title={t("restore")}
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">
                {rev.summary || t("autoSnapshot")}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
                <span>
                  {new Date(rev.createdAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {rev.wordCount != null && (
                  <span>{rev.wordCount} w</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 p-4 text-center">
          <History className="h-5 w-5 text-muted-foreground/30" />
          <p className="text-[10px] text-muted-foreground">{t("noRevisions")}</p>
        </div>
      )}
    </div>
  );
}
