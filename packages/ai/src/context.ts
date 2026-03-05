export interface ContextLayer {
  label: string;
  content: string;
  priority: number;
}

export interface ChatContextInput {
  bibleText?: string;
  pins: Array<{ content: string; label?: string | null }>;
  currentSceneText?: string;
  adjacentScenesText?: string;
  documentSummary?: string;
  ragChunks?: Array<{ content: string }>;
}

export interface ChatContext {
  contextBlocks: string;
  tokenEstimate: number;
}

const MAX_CONTEXT_CHARS = 60_000;

export function buildChatContext(input: ChatContextInput): ChatContext {
  const layers: ContextLayer[] = [];

  if (input.bibleText) {
    layers.push({ label: "PROJECT BIBLE", content: input.bibleText, priority: 1 });
  }

  if (input.pins.length > 0) {
    const pinsText = input.pins
      .map((p, i) => `[Pin ${i + 1}${p.label ? ` — ${p.label}` : ""}]\n${p.content}`)
      .join("\n\n");
    layers.push({ label: "CONTEXT PINS", content: pinsText, priority: 2 });
  }

  if (input.currentSceneText) {
    layers.push({ label: "CURRENT SCENE", content: input.currentSceneText, priority: 3 });
  }

  if (input.adjacentScenesText) {
    layers.push({ label: "ADJACENT SCENES", content: input.adjacentScenesText, priority: 4 });
  }

  if (input.ragChunks && input.ragChunks.length > 0) {
    const ragText = input.ragChunks.map((c) => c.content).join("\n---\n");
    layers.push({ label: "RETRIEVED CONTEXT", content: ragText, priority: 5 });
  }

  if (input.documentSummary) {
    layers.push({ label: "FULL DOCUMENT", content: input.documentSummary, priority: 6 });
  }

  layers.sort((a, b) => a.priority - b.priority);

  let totalChars = 0;
  const includedBlocks: string[] = [];

  for (const layer of layers) {
    if (totalChars + layer.content.length > MAX_CONTEXT_CHARS) {
      const remaining = MAX_CONTEXT_CHARS - totalChars;
      if (remaining > 200) {
        includedBlocks.push(
          `=== ${layer.label} (truncated) ===\n${layer.content.slice(0, remaining)}\n...`
        );
        totalChars += remaining;
      }
      break;
    }
    includedBlocks.push(`=== ${layer.label} ===\n${layer.content}`);
    totalChars += layer.content.length;
  }

  const contextBlocks = includedBlocks.join("\n\n");

  return {
    contextBlocks,
    tokenEstimate: Math.ceil(totalChars / 4),
  };
}
