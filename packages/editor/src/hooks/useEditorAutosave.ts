import { useCallback, useRef, useEffect } from "react";
import { type JSONContent } from "@tiptap/core";

export function useEditorAutosave(
  saveFn: (content: JSONContent) => Promise<void>,
  delay = 2000
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContent = useRef<JSONContent | null>(null);
  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;

  const handleUpdate = useCallback(
    (content: JSONContent) => {
      latestContent.current = content;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(async () => {
        if (latestContent.current) {
          const contentToSave = latestContent.current;
          try {
            await saveFnRef.current(contentToSave);
            latestContent.current = null;
          } catch {
            // Keep content — next edit will retry
          }
        }
      }, delay);
    },
    [delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return handleUpdate;
}
