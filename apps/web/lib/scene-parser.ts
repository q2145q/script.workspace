/**
 * Parse scene headings to extract INT/EXT, location, and time of day.
 *
 * Supports English (INT./EXT.) and Russian (ИНТ./НАТ.) formats.
 */

export interface ParsedScene {
  sceneIndex: number;
  heading: string;
  intExt: string | null;
  location: string | null;
  timeOfDay: string | null;
}

/**
 * Regex to match scene heading patterns:
 * - INT. / EXT. / INT./EXT. / I/E.
 * - ИНТ. / НАТ. / ИНТ./НАТ.
 * Captures: [intExt] [location] - [timeOfDay]
 */
const SCENE_HEADING_RE =
  /^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.|ИНТ\.|НАТ\.|ИНТ\.\/НАТ\.)\s+(.+?)(?:\s*[-—]\s*(.+))?$/i;

export function parseSceneHeading(heading: string): {
  intExt: string | null;
  location: string | null;
  timeOfDay: string | null;
} {
  const match = heading.trim().match(SCENE_HEADING_RE);
  if (!match) {
    return { intExt: null, location: null, timeOfDay: null };
  }

  const rawIntExt = match[1].toUpperCase();
  const location = match[2]?.trim() || null;
  const timeOfDay = match[3]?.trim() || null;

  // Normalize INT/EXT
  let intExt: string;
  if (rawIntExt.includes("/")) {
    intExt = "INT/EXT";
  } else if (rawIntExt.startsWith("INT") || rawIntExt.startsWith("ИНТ")) {
    intExt = "INT";
  } else {
    intExt = "EXT";
  }

  return { intExt, location, timeOfDay };
}

/**
 * Extract character names from a TipTap document's character blocks.
 * Looks for nodes with type "character" and extracts their text content.
 */
export function extractCharactersFromContent(content: unknown): string[] {
  const chars = new Set<string>();

  function walk(node: unknown) {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n.type === "character" && Array.isArray(n.content)) {
      for (const child of n.content) {
        const c = child as Record<string, unknown>;
        if (c.type === "text" && typeof c.text === "string") {
          const name = c.text.trim().replace(/\s*\(.*\)$/, ""); // Remove (V.O.) etc
          if (name) chars.add(name);
        }
      }
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) walk(child);
    }
  }

  walk(content);
  return Array.from(chars);
}
