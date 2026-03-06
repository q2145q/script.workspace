import { useCallback, useRef, useEffect, useState } from "react";
import { type JSONContent } from "@tiptap/core";

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface AutosaveResult {
  handleUpdate: (content: JSONContent) => void;
  saveState: SaveState;
  lastSavedAt: Date | null;
}

export function useEditorAutosave(
  saveFn: (content: JSONContent) => Promise<void>,
  delay = 2000
): AutosaveResult {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContent = useRef<JSONContent | null>(null);
  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const handleUpdate = useCallback(
    (content: JSONContent) => {
      latestContent.current = content;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      timeoutRef.current = setTimeout(async () => {
        if (latestContent.current) {
          const contentToSave = latestContent.current;
          setSaveState("saving");
          try {
            await saveFnRef.current(contentToSave);
            latestContent.current = null;
            setSaveState("saved");
            setLastSavedAt(new Date());
            idleTimerRef.current = setTimeout(() => setSaveState("idle"), 3000);
          } catch {
            setSaveState("error");
          }
        }
      }, delay);
    },
    [delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  return { handleUpdate, saveState, lastSavedAt };
}
