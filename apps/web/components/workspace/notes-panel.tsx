"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ScriptEditor, useEditorAutosave, type JSONContent, type CollaborationConfig, type HocuspocusProvider } from "@script/editor";
import { StickyNote, Plus, Trash2, Pencil, Check, X, Save } from "lucide-react";
import { CollabStatus } from "./collab-status";
import { OnlineUsers } from "./online-users";
import type { CurrentUser } from "./workspace-shell";

function hashToColor(str: string): string {
  const colors = [
    "#E57373", "#F06292", "#BA68C8", "#9575CD",
    "#7986CB", "#64B5F6", "#4FC3F7", "#4DD0E1",
    "#4DB6AC", "#81C784", "#AED581", "#FFD54F",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface NotesPanelProps {
  projectId: string;
  currentUser: CurrentUser;
}

export function NotesPanel({ projectId, currentUser }: NotesPanelProps) {
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
        toast.success("Note created");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const deleteMutation = useMutation(
    trpc.note.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.note.list.queryKey({ projectId }) });
        setSelectedNoteId(null);
        toast.success("Note deleted");
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
          <span className="text-sm font-medium text-foreground">Notes</span>
        </div>
        <button
          onClick={() => createMutation.mutate({ projectId })}
          disabled={createMutation.isPending}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          New
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
                    if (confirm("Delete this note?")) {
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
              <p className="text-xs text-muted-foreground">No notes yet</p>
              <button
                onClick={() => createMutation.mutate({ projectId })}
                className="text-xs text-ai-accent hover:underline"
              >
                Create first note
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
                ? "Select a note to edit"
                : "Create a note to get started"}
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
  currentUser,
}: {
  noteId: string;
  projectId: string;
  currentUser: CurrentUser;
}) {
  const trpc = useTRPC();
  const [collabProvider, setCollabProvider] = useState<HocuspocusProvider | null>(null);
  const noteIdRef = useRef(noteId);
  noteIdRef.current = noteId;

  // Only use collab if explicitly configured
  const collabWsUrl = process.env.NEXT_PUBLIC_COLLAB_WS_URL || "";
  const useCollab = !!collabWsUrl;

  const collabConfig: CollaborationConfig | undefined = useMemo(() => {
    if (!useCollab) return undefined;

    return {
      documentName: `note:${noteId}`,
      wsUrl: collabWsUrl,
      user: {
        id: currentUser.id,
        name: currentUser.name,
        color: hashToColor(currentUser.id),
      },
    };
  }, [noteId, currentUser, useCollab, collabWsUrl]);

  // Load note content when not using collab
  const { data: noteData, isLoading: noteLoading } = useQuery({
    ...trpc.note.getById.queryOptions({ id: noteId }),
    enabled: !useCollab,
  });

  // Direct-save for notes
  const saveMutation = useMutation(
    trpc.note.updateContent.mutationOptions({
      onError: (err) => console.error("Note autosave failed:", err.message),
    })
  );

  const saveFnRef = useRef(saveMutation.mutateAsync);
  saveFnRef.current = saveMutation.mutateAsync;

  const handleAutosave = useEditorAutosave(
    useCallback(async (content: JSONContent) => {
      await saveFnRef.current({ id: noteIdRef.current, content });
    }, []),
    2000
  );

  const handleUpdate = useCallback(
    (content: JSONContent) => {
      if (!useCollab) {
        handleAutosave(content);
      }
    },
    [useCollab, handleAutosave]
  );

  // Wait for note data to load before rendering editor (content is only read on mount)
  if (!useCollab && noteLoading) {
    return (
      <div className="flex h-full items-center justify-center font-mono">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  // Use noteId + data availability as key to force remount when switching notes
  const editorKey = useCollab ? noteId : `${noteId}-${noteData?.id ?? "new"}`;

  return (
    <div className="flex h-full flex-col font-mono">
      <div className="flex items-center justify-end gap-2 border-b border-border px-3 py-1">
        {useCollab ? (
          <>
            <OnlineUsers provider={collabProvider} />
            <CollabStatus provider={collabProvider} />
          </>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-emerald-500">
            <Save className="h-3 w-3" />
            Auto-save
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <ScriptEditor
          key={editorKey}
          content={!useCollab ? (noteData?.content as JSONContent ?? undefined) : undefined}
          collaboration={collabConfig}
          onUpdate={handleUpdate}
          onCollabProvider={useCollab ? setCollabProvider : undefined}
          hideToolbar
          plainText
        />
      </div>
    </div>
  );
}
