import { Fountain, type Token } from "fountain-js";
import type { JSONContent } from "@tiptap/core";

const TYPE_MAP: Record<string, string> = {
  scene_heading: "sceneHeading",
  action: "action",
  character: "character",
  dialogue: "dialogue",
  parenthetical: "parenthetical",
  transition: "transition",
  centered: "action",
  lyrics: "action",
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function tokenToNode(token: Token): JSONContent | null {
  const nodeType = TYPE_MAP[token.type];
  if (!nodeType || !token.text) return null;

  const text = stripHtml(token.text).trim();
  if (!text) return null;

  return {
    type: nodeType,
    content: [{ type: "text", text }],
  };
}

export function parseFountain(source: string): JSONContent {
  const fountain = new Fountain();
  const result = fountain.parse(source, true);

  const nodes: JSONContent[] = [];

  for (const token of result.tokens) {
    // Skip structural/wrapper tokens
    if (
      token.type === "dialogue_begin" ||
      token.type === "dialogue_end" ||
      token.type === "dual_dialogue_begin" ||
      token.type === "dual_dialogue_end" ||
      token.type === "page_break" ||
      token.type === "spaces" ||
      token.type === "section" ||
      token.type === "synopsis" ||
      token.type === "note"
    ) {
      continue;
    }

    // Skip title page tokens
    if (token.is_title) continue;

    const node = tokenToNode(token);
    if (node) {
      nodes.push(node);
    }
  }

  // Ensure at least one action node
  if (nodes.length === 0) {
    nodes.push({ type: "action", content: [{ type: "text", text: " " }] });
  }

  return { type: "doc", content: nodes };
}

export function decodeFountainFile(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    // Fallback to windows-1251 for Cyrillic scripts
    return new TextDecoder("windows-1251").decode(buffer);
  }
}
