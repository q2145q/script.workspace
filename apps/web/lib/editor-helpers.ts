import type { Editor } from "@script/editor";

/** Extract context around the cursor position for AI chat */
export function extractEditorContext(editor: Editor | null) {
  if (!editor) return undefined;

  const { doc, selection } = editor.state;
  const cursorPos = selection.from;

  let sceneStart = 0;
  let sceneEnd = doc.content.size;
  let prevSceneStart = 0;
  let nextSceneEnd = doc.content.size;
  let foundCurrent = false;

  doc.descendants((node, pos) => {
    if (node.type.name === "sceneHeading" || node.type.name === "scene-heading") {
      if (pos <= cursorPos) {
        prevSceneStart = sceneStart;
        sceneStart = pos;
        foundCurrent = true;
      } else if (foundCurrent && sceneEnd === doc.content.size) {
        sceneEnd = pos;
        nextSceneEnd = doc.content.size;
      } else if (sceneEnd !== doc.content.size && nextSceneEnd === doc.content.size) {
        nextSceneEnd = pos;
      }
    }
  });

  const currentSceneText = doc.textBetween(sceneStart, sceneEnd, "\n");

  let adjacentScenesText = "";
  if (prevSceneStart !== sceneStart) {
    adjacentScenesText += doc.textBetween(prevSceneStart, sceneStart, "\n");
  }
  if (sceneEnd < nextSceneEnd) {
    adjacentScenesText += "\n" + doc.textBetween(sceneEnd, nextSceneEnd, "\n");
  }

  const fullText = doc.textBetween(0, doc.content.size, "\n");
  const documentSummary = fullText.slice(0, 10000);

  return {
    currentSceneText,
    adjacentScenesText: adjacentScenesText || undefined,
    documentSummary,
  };
}

/** Extract all scene headings from the editor for @-mentions */
export function extractSceneHeadings(editor: Editor | null): string[] {
  if (!editor) return [];
  const headings: string[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "sceneHeading" || node.type.name === "scene-heading") {
      const text = node.textContent.trim();
      if (text) headings.push(text);
    }
  });
  return headings;
}

/** Extract full text of a scene by heading */
export function extractSceneTextByHeading(editor: Editor, heading: string): string {
  const { doc } = editor.state;
  let sceneStart = -1;
  let sceneEnd = doc.content.size;

  doc.descendants((node, pos) => {
    if (node.type.name === "sceneHeading" || node.type.name === "scene-heading") {
      const text = node.textContent.trim();
      if (text === heading && sceneStart === -1) {
        sceneStart = pos;
      } else if (sceneStart !== -1 && sceneEnd === doc.content.size) {
        sceneEnd = pos;
      }
    }
  });

  if (sceneStart === -1) return "";
  return doc.textBetween(sceneStart, sceneEnd, "\n");
}

/** Parse @[SCENE HEADING] references from text and extract scene contents */
export function parseSceneReferences(
  text: string,
  editor: Editor | null,
): { cleanText: string; sceneTexts: string[] } {
  if (!editor) return { cleanText: text, sceneTexts: [] };

  const refPattern = /@\[([^\]]+)\]/g;
  const sceneTexts: string[] = [];
  let match;

  while ((match = refPattern.exec(text)) !== null) {
    const heading = match[1];
    const sceneText = extractSceneTextByHeading(editor, heading);
    if (sceneText) sceneTexts.push(sceneText);
  }

  return { cleanText: text, sceneTexts };
}

/** Get scene heading positions for the insert picker */
export function getScenePositions(editor: Editor): Array<{ heading: string; endPos: number }> {
  const { doc } = editor.state;
  const scenes: Array<{ heading: string; startPos: number; endPos: number }> = [];

  doc.descendants((node, pos) => {
    if (node.type.name === "sceneHeading" || node.type.name === "scene-heading") {
      const text = node.textContent.trim();
      if (text) {
        if (scenes.length > 0) {
          scenes[scenes.length - 1].endPos = pos;
        }
        scenes.push({ heading: text, startPos: pos, endPos: doc.content.size });
      }
    }
  });

  return scenes.map((s) => ({ heading: s.heading, endPos: s.endPos }));
}
