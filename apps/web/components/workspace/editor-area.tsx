"use client";

import { useCallback } from "react";
import { ScriptEditor, useEditorAutosave, type JSONContent } from "@script/editor";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface EditorAreaProps {
  document: {
    id: string;
    title: string;
    content: unknown;
  };
}

export function EditorArea({ document }: EditorAreaProps) {
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

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-medium">{document.title}</span>
        <span className="text-xs text-muted-foreground">
          {saveMutation.isPending ? "Saving..." : "Saved"}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ScriptEditor
          content={document.content as JSONContent}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  );
}
