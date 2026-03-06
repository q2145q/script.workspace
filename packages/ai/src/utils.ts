/**
 * Strip markdown code fences from AI response text.
 * Handles ```json ... ``` and plain ``` ... ``` blocks.
 */
export function stripCodeFences(text: string): string {
  let raw = text.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return raw;
}

/**
 * Estimate token count from text length.
 * Russian/Cyrillic text uses ~2 chars/token, English ~4 chars/token.
 */
export function estimateTokens(text: string, language?: string): number {
  const hasCyrillic = /[\u0400-\u04FF]/.test(text);
  const divisor = language === "ru" || hasCyrillic ? 2 : 4;
  return Math.ceil(text.length / divisor);
}

/**
 * Extract plain text from a TipTap JSON document.
 * Walks the node tree recursively, joining text content with newlines.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractTextFromTipTapJson(json: any): string {
  if (!json) return "";

  // Text node
  if (typeof json.text === "string") {
    return json.text;
  }

  // Node with content array
  if (Array.isArray(json.content)) {
    const parts: string[] = [];
    for (const child of json.content) {
      const text = extractTextFromTipTapJson(child);
      if (text) parts.push(text);
    }
    return parts.join("\n");
  }

  return "";
}

/**
 * Extract scene headings from a TipTap JSON document to build screenplay structure.
 * Returns a numbered list of scene headings, e.g.:
 *   1. INT. OFFICE - DAY
 *   2. EXT. PARK - NIGHT
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractScreenplayStructure(documents: Array<{ title: string; content: any }>): string {
  const headings: string[] = [];

  for (const doc of documents) {
    extractHeadingsFromNode(doc.content, headings);
  }

  if (headings.length === 0) return "";

  return headings.map((h, i) => `${i + 1}. ${h}`).join("\n");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractHeadingsFromNode(node: any, headings: string[]): void {
  if (!node) return;

  if (node.type === "sceneHeading") {
    const text = extractTextFromTipTapJson(node);
    if (text.trim()) headings.push(text.trim());
  }

  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      extractHeadingsFromNode(child, headings);
    }
  }
}
