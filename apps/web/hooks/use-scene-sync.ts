"use client";

import { useRef, useEffect, useCallback } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation } from "@tanstack/react-query";
import type { Editor } from "@script/editor";
import { parseSceneHeading } from "@/lib/scene-parser";

/**
 * Debounced sync of scene metadata from the editor to the database.
 * Extracts scene headings, parses INT/EXT, location, time-of-day,
 * and upserts to SceneMetadata table.
 *
 * @param editor TipTap editor instance
 * @param documentId Current document ID
 * @param debounceMs Debounce interval (default 5000ms)
 */
export function useSceneSync(
  editor: Editor | null,
  documentId: string,
  debounceMs = 5000
) {
  const trpc = useTRPC();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHashRef = useRef<string>("");

  const syncMutation = useMutation(
    trpc.sceneMetadata.sync.mutationOptions({
      onError: (err) => {
        console.warn("Scene metadata sync failed:", err.message);
      },
    })
  );

  const syncRef = useRef(syncMutation.mutateAsync);
  syncRef.current = syncMutation.mutateAsync;

  const doSync = useCallback(() => {
    if (!editor) return;

    const doc = editor.getJSON();
    if (!doc?.content) return;

    // Extract scene headings from TipTap content
    const scenes: Array<{
      sceneIndex: number;
      heading: string;
      intExt: string | null;
      timeOfDay: string | null;
      location: string | null;
      characters: string[];
    }> = [];

    let sceneIndex = 0;
    let currentSceneChars = new Set<string>();

    for (const node of doc.content) {
      if (node.type === "sceneHeading") {
        // Save previous scene characters
        if (scenes.length > 0) {
          scenes[scenes.length - 1].characters = Array.from(currentSceneChars);
        }

        const headingText =
          node.content?.map((c: { text?: string }) => c.text ?? "").join("") ?? "";

        if (headingText.trim()) {
          const parsed = parseSceneHeading(headingText);
          scenes.push({
            sceneIndex,
            heading: headingText.trim(),
            intExt: parsed.intExt,
            timeOfDay: parsed.timeOfDay,
            location: parsed.location,
            characters: [],
          });
          sceneIndex++;
          currentSceneChars = new Set<string>();
        }
      } else if (node.type === "character") {
        const charText =
          node.content?.map((c: { text?: string }) => c.text ?? "").join("") ?? "";
        const charName = charText.trim().replace(/\s*\(.*\)$/, "");
        if (charName) currentSceneChars.add(charName);
      }
    }

    // Last scene characters
    if (scenes.length > 0) {
      scenes[scenes.length - 1].characters = Array.from(currentSceneChars);
    }

    // Simple hash to avoid unnecessary syncs
    const hash = JSON.stringify(scenes.map((s) => s.heading));
    if (hash === lastHashRef.current) return;
    lastHashRef.current = hash;

    syncRef.current({ documentId, scenes }).catch(() => {});
  }, [editor, documentId]);

  useEffect(() => {
    if (!editor) return;

    const handler = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(doSync, debounceMs);
    };

    editor.on("update", handler);

    // Initial sync
    const initTimer = setTimeout(doSync, 1000);

    return () => {
      editor.off("update", handler);
      if (timerRef.current) clearTimeout(timerRef.current);
      clearTimeout(initTimer);
    };
  }, [editor, doSync, debounceMs]);
}
