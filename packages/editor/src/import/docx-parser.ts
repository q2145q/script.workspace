import mammoth from "mammoth";
import type { JSONContent } from "@tiptap/core";

/**
 * Parse a .docx file buffer into TipTap JSONContent.
 * Extracts plain text from the docx and attempts to identify screenplay elements
 * based on common formatting patterns (uppercase lines = scene headings/characters, etc.)
 */
export async function parseDocx(buffer: ArrayBuffer): Promise<JSONContent> {
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  const text = result.value;

  if (!text.trim()) {
    return { type: "doc", content: [{ type: "action", content: [{ type: "text", text: " " }] }] };
  }

  const lines = text.split(/\r?\n/);
  const nodes: JSONContent[] = [];

  const sceneHeadingRe = /^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.|ИНТ\.|НАТ\.|ИНТ\.\/НАТ\.)\s+/i;
  const transitionRe = /^(CUT TO:|FADE IN:|FADE OUT\.|FADE TO:|SMASH CUT TO:|DISSOLVE TO:)\s*$/i;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trimEnd();

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Scene heading
    if (sceneHeadingRe.test(line.trim())) {
      nodes.push({ type: "sceneHeading", content: [{ type: "text", text: line.trim() }] });
      i++;
      continue;
    }

    // Transition
    if (transitionRe.test(line.trim())) {
      nodes.push({ type: "transition", content: [{ type: "text", text: line.trim() }] });
      i++;
      continue;
    }

    // Character name: all uppercase, may have (V.O.) etc., followed by dialogue
    const trimmed = line.trim();
    const isUpperCase = trimmed === trimmed.toUpperCase() && /^[A-ZА-ЯЁ\s()\-./']+$/.test(trimmed) && trimmed.length > 1 && trimmed.length < 50;

    if (isUpperCase && i + 1 < lines.length && lines[i + 1].trim()) {
      // Check if next line looks like dialogue (not another uppercase line or scene heading)
      const nextLine = lines[i + 1].trim();
      const nextIsUpperCase = nextLine === nextLine.toUpperCase() && /^[A-ZА-ЯЁ\s()\-./']+$/.test(nextLine);
      const nextIsSceneHeading = sceneHeadingRe.test(nextLine);

      if (!nextIsUpperCase && !nextIsSceneHeading) {
        // Character name
        nodes.push({ type: "character", content: [{ type: "text", text: trimmed }] });
        i++;

        // Parenthetical
        while (i < lines.length && lines[i].trim().startsWith("(") && lines[i].trim().endsWith(")")) {
          nodes.push({ type: "parenthetical", content: [{ type: "text", text: lines[i].trim() }] });
          i++;
        }

        // Dialogue lines
        while (i < lines.length && lines[i].trim() && !sceneHeadingRe.test(lines[i].trim())) {
          const dl = lines[i].trim();
          if (dl.startsWith("(") && dl.endsWith(")")) {
            nodes.push({ type: "parenthetical", content: [{ type: "text", text: dl }] });
          } else if (dl === dl.toUpperCase() && /^[A-ZА-ЯЁ\s()\-./']+$/.test(dl) && dl.length < 50) {
            // Next character — stop dialogue
            break;
          } else {
            nodes.push({ type: "dialogue", content: [{ type: "text", text: dl }] });
          }
          i++;
        }
        continue;
      }
    }

    // Default: action
    nodes.push({ type: "action", content: [{ type: "text", text: trimmed }] });
    i++;
  }

  if (nodes.length === 0) {
    nodes.push({ type: "action", content: [{ type: "text", text: " " }] });
  }

  return { type: "doc", content: nodes };
}
