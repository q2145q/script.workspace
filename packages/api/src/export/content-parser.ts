export interface TextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export interface ScreenplayBlock {
  type:
    | "sceneHeading"
    | "action"
    | "character"
    | "dialogue"
    | "parenthetical"
    | "transition"
    | "shot"
    | "paragraph";
  text: string;
  segments: TextSegment[];
  sceneNumber?: number;
}

export interface ScreenplayMetadata {
  title: string;
  author: string;
  contact?: string;
  company?: string;
}

const BLOCK_TYPES = new Set([
  "sceneHeading",
  "action",
  "character",
  "dialogue",
  "parenthetical",
  "transition",
  "shot",
]);

export function parseContent(
  content: Record<string, unknown>
): ScreenplayBlock[] {
  const doc = content as {
    type: string;
    content?: Array<Record<string, unknown>>;
  };
  if (!doc.content) return [];

  let sceneCount = 0;
  const blocks: ScreenplayBlock[] = [];

  for (const node of doc.content) {
    const type = node.type as string;
    const segments = extractSegments(node);
    const text = segments.map((s) => s.text).join("");

    if (!text.trim()) continue;

    const blockType = BLOCK_TYPES.has(type)
      ? (type as ScreenplayBlock["type"])
      : "paragraph";

    if (blockType === "sceneHeading") {
      sceneCount++;
    }

    blocks.push({
      type: blockType,
      text,
      segments,
      sceneNumber: blockType === "sceneHeading" ? sceneCount : undefined,
    });
  }

  return blocks;
}

function extractSegments(node: Record<string, unknown>): TextSegment[] {
  const content = node.content as Array<Record<string, unknown>> | undefined;
  if (!content) {
    if (typeof node.text === "string") {
      return [buildSegment(node)];
    }
    return [];
  }

  const segments: TextSegment[] = [];
  for (const child of content) {
    if (typeof child.text === "string") {
      segments.push(buildSegment(child));
    } else if (child.content) {
      segments.push(...extractSegments(child));
    }
  }
  return segments;
}

function buildSegment(node: Record<string, unknown>): TextSegment {
  const marks = node.marks as Array<{ type: string }> | undefined;
  const seg: TextSegment = { text: node.text as string };
  if (marks) {
    for (const mark of marks) {
      if (mark.type === "bold") seg.bold = true;
      if (mark.type === "italic") seg.italic = true;
    }
  }
  return seg;
}
