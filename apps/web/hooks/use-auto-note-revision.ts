"use client";

import { useRef, useEffect, useCallback } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation } from "@tanstack/react-query";
import type { Editor } from "@script/editor";

/** Simple FNV-1a hash (matches server implementation) */
function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Auto-snapshot for notes: sends content hash to the server every `intervalMs`.
 * The server only creates a revision if the hash changed since the last one.
 */
export function useAutoNoteRevision(
  editor: Editor | null,
  noteId: string,
  intervalMs = 30 * 60 * 1000
) {
  const trpc = useTRPC();

  const autoSnapshotMutation = useMutation(
    trpc.noteRevision.autoSnapshot.mutationOptions({
      onError: (err) => {
        console.warn("Note auto-snapshot failed:", err.message);
      },
    })
  );

  const mutateRef = useRef(autoSnapshotMutation.mutateAsync);
  mutateRef.current = autoSnapshotMutation.mutateAsync;

  const doSnapshot = useCallback(() => {
    if (!editor) return;
    const content = editor.getJSON();
    const hash = fnv1a(JSON.stringify(content));
    mutateRef.current({ noteId, contentHash: hash }).catch((err) => console.error("[auto-note-revision] Snapshot failed:", err));
  }, [editor, noteId]);

  useEffect(() => {
    if (!editor) return;

    // First snapshot after 5 minutes
    const initialTimer = setTimeout(doSnapshot, 5 * 60 * 1000);

    // Then every intervalMs
    const interval = setInterval(doSnapshot, intervalMs);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [editor, doSnapshot, intervalMs]);
}
