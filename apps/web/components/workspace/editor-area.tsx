"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScriptEditor, EditorToolbar, useEditorAutosave, useEditorState, type JSONContent, type Editor } from "@script/editor";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pin, Save } from "lucide-react";
import { AICommandBar } from "./ai-command-bar";
import { ExportDialog } from "./export-dialog";

interface EditorAreaProps {
  document: {
    id: string;
    title: string;
    content: unknown;
  };
  projectTitle: string;
  projectId: string;
  onEditorReady?: (editor: Editor) => void;
}

function PinButton({ editor, projectId }: { editor: Editor; projectId: string }) {
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
      title="Pin selection to AI context"
    >
      <Pin className="h-3 w-3" />
      Pin
    </button>
  );
}

function SaveDraftButton({ documentId }: { documentId: string }) {
  const trpc = useTRPC();
  const draftMutation = useMutation(
    trpc.draft.create.mutationOptions({
      onSuccess: () => toast.success("Draft saved"),
      onError: (err) => toast.error(err.message),
    })
  );

  return (
    <button
      onClick={() => draftMutation.mutate({ documentId })}
      disabled={draftMutation.isPending}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-ai-accent/10 hover:text-ai-accent disabled:opacity-50"
      title="Save current version as draft"
    >
      <Save className="h-3 w-3" />
      Draft
    </button>
  );
}

export function EditorArea({ document, projectTitle, projectId, onEditorReady }: EditorAreaProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const trpc = useTRPC();

  const saveMutation = useMutation(
    trpc.document.save.mutationOptions({
      onError: (err) => {
        toast.error(`Failed to save: ${err.message}`);
      },
    })
  );

  const saveFn = useCallback(
    async (content: JSONContent) => {
      await saveMutation.mutateAsync({
        id: document.id,
        content,
      });
    },
    [document.id, saveMutation]
  );

  const handleUpdate = useEditorAutosave(saveFn);

  const handleEditorReady = useCallback(
    (ed: Editor) => {
      setEditor(ed);
      onEditorReady?.(ed);
    },
    [onEditorReady]
  );

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header bar with glass effect */}
      <div className="glass-panel flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-medium text-foreground">{document.title}</span>
        <div className="flex items-center gap-2">
          {editor && <PinButton editor={editor} projectId={projectId} />}
          <SaveDraftButton documentId={document.id} />
          <ExportDialog documentId={document.id} projectTitle={projectTitle} />
          <AnimatePresence mode="wait">
            <motion.span
              key={saveMutation.isPending ? "saving" : "saved"}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="text-xs text-muted-foreground"
            >
              {saveMutation.isPending ? "Saving..." : "Saved"}
            </motion.span>
          </AnimatePresence>
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
          content={document.content as JSONContent}
          onUpdate={handleUpdate}
          onEditorReady={handleEditorReady}
          hideToolbar
        />
      </div>

      {/* AI Command Bar (Cmd+K) */}
      <AICommandBar editor={editor} documentId={document.id} />
    </div>
  );
}
