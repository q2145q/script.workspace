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
