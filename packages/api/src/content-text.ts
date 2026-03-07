/** Extract plain text from TipTap JSON for full-text search indexing */
export function extractPlainText(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const node = content as Record<string, unknown>;
  if (node.type === "text" && typeof node.text === "string") return node.text;
  if (!Array.isArray(node.content)) return "";
  return (node.content as unknown[]).map(extractPlainText).join(" ");
}
