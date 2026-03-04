"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScriptEditor,
  useEditorAutosave,
  type JSONContent,
} from "@script/editor";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

interface BibleEditorProps {
  projectId: string;
}

export function BibleEditor({ projectId }: BibleEditorProps) {
  const trpc = useTRPC();

  const { data: bible, isLoading } = useQuery(
    trpc.bible.get.queryOptions({ projectId })
  );

  const saveMutation = useMutation(
    trpc.bible.save.mutationOptions({
      onError: (err) => toast.error(`Failed to save bible: ${err.message}`),
    })
  );

  const saveFn = useCallback(
    async (content: JSONContent) => {
      await saveMutation.mutateAsync({ projectId, content });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId]
  );

  const handleUpdate = useEditorAutosave(saveFn);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-ai-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header bar */}
      <div className="glass-panel flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-ai-accent" />
          <span className="text-sm font-medium text-foreground">
            Project Bible
          </span>
        </div>
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

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto">
        <ScriptEditor
          key="bible"
          content={(bible?.content as JSONContent) ?? undefined}
          onUpdate={handleUpdate}
          hideToolbar={false}
        />
      </div>
    </div>
  );
}
