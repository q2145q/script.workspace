/**
 * Check if a model does not support custom temperature values.
 * OpenAI reasoning models (o-series, gpt-5 family) and some thinking models
 * only accept the default temperature (1).
 */
export function isFixedTemperatureModel(modelId: string): boolean {
  // OpenAI reasoning models: o1, o3, o4-mini, etc.
  if (/^o\d/.test(modelId)) return true;
  // OpenAI GPT-5 family (reasoning-native, no custom temperature)
  if (modelId.startsWith("gpt-5")) return true;
  // Any model with "reasoner" in the name
  if (modelId.includes("reasoner")) return true;
  return false;
}

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
 * Extract the first valid JSON object or array from text.
 * Handles: plain JSON, JSON with trailing text, code-fenced JSON, markdown wrapping.
 * Returns the extracted JSON string, or the original text if no JSON found.
 */
export function extractJson(text: string): string {
  const stripped = stripCodeFences(text).trim();
  // Try parsing directly first
  try { JSON.parse(stripped); return stripped; } catch {}

  // Find first { or [ and extract the balanced JSON
  const startObj = stripped.indexOf("{");
  const startArr = stripped.indexOf("[");
  const start = startObj === -1 ? startArr : startArr === -1 ? startObj : Math.min(startObj, startArr);
  if (start === -1) return stripped;

  const openChar = stripped[start];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        const candidate = stripped.slice(start, i + 1);
        try { JSON.parse(candidate); return candidate; } catch { return stripped; }
      }
    }
  }
  return stripped;
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
