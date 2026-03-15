import type { RAGSearchResult } from "./rag-search";

/**
 * Smart context assembly with 7 priority layers.
 * Replaces buildChatContext() for RAG-enabled AI calls.
 *
 * Layer limits (from TZ):
 *   1. Bible          — 15,000 chars
 *   2. Characters     —  5,000 chars
 *   3. Context Pins   —  5,000 chars
 *   4. Current Scene  —  5,000 chars
 *   5. RAG scenes     — 20,000 chars
 *   6. Adjacent scenes—  5,000 chars
 *   7. Chat history   —  5,000 chars
 *   TOTAL            — 60,000 chars max
 */

export const MAX_SMART_CONTEXT_CHARS = 60_000;

const LAYER_LIMITS: Record<string, number> = {
  bible: 15_000,
  characters: 5_000,
  pins: 5_000,
  currentScene: 5_000,
  ragScenes: 20_000,
  adjacentScenes: 5_000,
  chatHistory: 5_000,
};

export interface SmartContextInput {
  /** Project bible text (full or sectioned) */
  bibleText?: string;
  /** Character descriptions from Character table */
  characters?: Array<{ name: string; description?: string | null; traits?: string[] }>;
  /** User-pinned context items */
  pins?: Array<{ content: string; label?: string | null }>;
  /** Text of the current scene (around cursor) */
  currentSceneText?: string;
  /** RAG search results — semantically relevant scenes */
  ragResults?: RAGSearchResult[];
  /** Text of adjacent scenes (±2 from current) */
  adjacentScenesText?: string;
  /** Recent chat messages */
  chatHistory?: Array<{ role: string; content: string }>;
  /** Episode summaries for multi-episode projects */
  episodeSummaries?: Array<{ content: string }>;
}

export interface SmartContext {
  /** Assembled context blocks as a single string */
  contextBlocks: string;
  /** Estimated token count (~4 chars per token) */
  tokenEstimate: number;
  /** Number of RAG scenes included */
  ragScenesUsed: number;
}

/**
 * Build smart context with 7 prioritized layers.
 * Each layer is capped at its individual limit.
 * Total output is capped at 60,000 chars.
 */
export function buildSmartContext(input: SmartContextInput): SmartContext {
  const blocks: Array<{ label: string; content: string; priority: number }> = [];
  let ragScenesUsed = 0;

  // Layer 1: Project Bible
  if (input.bibleText) {
    blocks.push({
      label: "PROJECT BIBLE",
      content: truncate(input.bibleText, LAYER_LIMITS.bible),
      priority: 1,
    });
  }

  // Layer 2: Characters
  if (input.characters && input.characters.length > 0) {
    const charText = input.characters
      .map((c) => {
        const parts = [c.name];
        if (c.description) parts.push(c.description);
        if (c.traits && c.traits.length > 0) parts.push(`Traits: ${c.traits.join(", ")}`);
        return parts.join(" — ");
      })
      .join("\n");
    blocks.push({
      label: "CHARACTERS",
      content: truncate(charText, LAYER_LIMITS.characters),
      priority: 2,
    });
  }

  // Layer 3: Context Pins
  if (input.pins && input.pins.length > 0) {
    const pinsText = input.pins
      .map((p, i) => `[Pin ${i + 1}${p.label ? ` — ${p.label}` : ""}]\n${p.content}`)
      .join("\n\n");
    blocks.push({
      label: "CONTEXT PINS",
      content: truncate(pinsText, LAYER_LIMITS.pins),
      priority: 3,
    });
  }

  // Layer 4: Current Scene
  if (input.currentSceneText) {
    blocks.push({
      label: "CURRENT SCENE",
      content: truncate(input.currentSceneText, LAYER_LIMITS.currentScene),
      priority: 4,
    });
  }

  // Layer 5: RAG — semantically relevant scenes
  if (input.ragResults && input.ragResults.length > 0) {
    const ragParts: string[] = [];
    let ragChars = 0;

    for (const result of input.ragResults) {
      const meta = result.metadata?.tags;
      const header = meta
        ? `[Scene: ${meta.location || "Unknown"} | Characters: ${(meta.characters || []).join(", ")} | Similarity: ${result.similarity.toFixed(2)}]`
        : `[Scene | Similarity: ${result.similarity.toFixed(2)}]`;
      const entry = `${header}\n${result.content}`;

      if (ragChars + entry.length > LAYER_LIMITS.ragScenes) break;
      ragParts.push(entry);
      ragChars += entry.length;
      ragScenesUsed++;
    }

    if (ragParts.length > 0) {
      blocks.push({
        label: "RELEVANT SCENES (RAG)",
        content: ragParts.join("\n---\n"),
        priority: 5,
      });
    }
  }

  // Layer 5b: Episode summaries (high priority for multi-episode)
  if (input.episodeSummaries && input.episodeSummaries.length > 0) {
    const summaryText = input.episodeSummaries
      .map((s, i) => `[Episode ${i + 1} Summary]\n${s.content}`)
      .join("\n---\n");
    // Use remaining RAG budget
    const ragBudgetUsed = blocks.find((b) => b.label.includes("RAG"))?.content.length || 0;
    const remaining = LAYER_LIMITS.ragScenes - ragBudgetUsed;
    if (remaining > 200) {
      blocks.push({
        label: "EPISODE SUMMARIES",
        content: truncate(summaryText, remaining),
        priority: 5,
      });
    }
  }

  // Layer 6: Adjacent Scenes
  if (input.adjacentScenesText) {
    blocks.push({
      label: "ADJACENT SCENES",
      content: truncate(input.adjacentScenesText, LAYER_LIMITS.adjacentScenes),
      priority: 6,
    });
  }

  // Layer 7: Chat History
  if (input.chatHistory && input.chatHistory.length > 0) {
    const historyText = input.chatHistory
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");
    blocks.push({
      label: "CHAT HISTORY",
      content: truncate(historyText, LAYER_LIMITS.chatHistory),
      priority: 7,
    });
  }

  // Sort by priority and assemble within total limit
  blocks.sort((a, b) => a.priority - b.priority);

  let totalChars = 0;
  const included: string[] = [];

  for (const block of blocks) {
    if (totalChars + block.content.length > MAX_SMART_CONTEXT_CHARS) {
      const remaining = MAX_SMART_CONTEXT_CHARS - totalChars;
      if (remaining > 200) {
        included.push(`=== ${block.label} (truncated) ===\n${block.content.slice(0, remaining)}\n...`);
        totalChars += remaining;
      }
      break;
    }
    included.push(`=== ${block.label} ===\n${block.content}`);
    totalChars += block.content.length;
  }

  return {
    contextBlocks: included.join("\n\n"),
    tokenEstimate: Math.ceil(totalChars / 4),
    ragScenesUsed,
  };
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit) + "\n...";
}
