"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScriptEditor, EditorToolbar, useEditorAutosave, type JSONContent, type Editor } from "@script/editor";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AICommandBar } from "./ai-command-bar";

interface EditorAreaProps {
  document: {
    id: string;
    title: string;
    content: unknown;
  };
  onEditorReady?: (editor: Editor) => void;
}

export function EditorArea({ document, onEditorReady }: EditorAreaProps) {
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
