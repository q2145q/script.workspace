import { useMemo } from "react";
import { type Editor, useEditorState } from "@tiptap/react";

export interface ScriptStats {
  pageCount: number;
  wordCount: number;
  sceneCount: number;
  characterCount: number;
  estimatedMinutes: number;
  characterDialogueMap: Map<string, number>;
}

// Approximate characters per line by block type (Courier 12pt, US Letter)
const CHARS_PER_LINE: Record<string, number> = {
  sceneHeading: 60,
  action: 60,
  character: 35,
  dialogue: 35,
  parenthetical: 25,
  transition: 60,
  shot: 60,
};

const LINES_PER_PAGE = 56;

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function estimateLines(type: string, text: string): number {
  const cpl = CHARS_PER_LINE[type] || 60;
  return Math.max(1, Math.ceil(text.length / cpl)) + 1; // +1 for spacing
}

export function useScriptStats(editor: Editor | null): ScriptStats {
  const docVersion = useEditorState({
    editor: editor!,
    selector: (ctx) => (ctx.editor ? ctx.editor.state.doc.content.size : 0),
  });

  return useMemo(() => {
    const empty: ScriptStats = {
      pageCount: 0,
      wordCount: 0,
      sceneCount: 0,
      characterCount: 0,
      estimatedMinutes: 0,
      characterDialogueMap: new Map(),
    };

    if (!editor) return empty;

    const doc = editor.state.doc;
    let wordCount = 0;
    let sceneCount = 0;
    let totalLines = 0;
    const characters = new Set<string>();
    const dialogueMap = new Map<string, number>();
    let lastCharacter = "";

    doc.descendants((node) => {
      if (!node.isBlock || !node.isTextblock) return;

      const type = node.type.name;
      const text = node.textContent;
      if (!text.trim()) return;

      const words = countWords(text);
      wordCount += words;
      totalLines += estimateLines(type, text);

      if (type === "sceneHeading") {
        sceneCount++;
      }

      if (type === "character") {
        const name = text
          .replace(/\s*\(CONT'D\)\s*$/i, "")
          .replace(/\s*\(ПРОД\.\)\s*$/i, "")
          .replace(/\s*\(V\.O\.\)\s*$/i, "")
          .replace(/\s*\(O\.S\.\)\s*$/i, "")
          .trim()
          .toUpperCase();
        if (name) {
          characters.add(name);
          lastCharacter = name;
        }
      }

      if (type === "dialogue" && lastCharacter) {
        const prev = dialogueMap.get(lastCharacter) || 0;
        dialogueMap.set(lastCharacter, prev + words);
      }
    });

    const pageCount = Math.max(1, Math.ceil(totalLines / LINES_PER_PAGE));

    return {
      pageCount,
      wordCount,
      sceneCount,
      characterCount: characters.size,
      estimatedMinutes: pageCount, // ~1 min per page
      characterDialogueMap: dialogueMap,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, docVersion]);
}
