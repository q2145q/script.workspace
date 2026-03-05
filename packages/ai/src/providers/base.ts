const NODE_TYPE_REMINDERS: Record<string, string> = {
  sceneHeading: "This is a scene heading. It MUST be ALL CAPS following INT./EXT. LOCATION - TIME format.",
  "scene-heading": "This is a scene heading. It MUST be ALL CAPS following INT./EXT. LOCATION - TIME format.",
  action: "This is an action line. Use present tense, sentence case. First character introductions in ALL CAPS.",
  character: "This is a character name. It MUST be ALL CAPS. May include extensions like (V.O.) or (O.S.).",
  dialogue: "This is dialogue. Use natural sentence case. No quotation marks.",
  parenthetical: "This is a parenthetical. Must be in parentheses, lowercase, very brief.",
  transition: "This is a transition. It MUST be ALL CAPS and typically ends with a colon.",
};

export function buildRewritePrompt(input: {
  selectedText: string;
  instruction: string;
  contextBefore: string;
  contextAfter: string;
  nodeType: string;
  blocks?: Array<{ type: string; text: string }>;
  previousResult?: string;
  language?: string;
}): string {
  const parts = [
    `=== CONTEXT BEFORE ===`,
    input.contextBefore.slice(-500),
  ];

  // Typed blocks format (preferred)
  if (input.blocks && input.blocks.length > 0) {
    parts.push(`=== SELECTED BLOCKS ===`);
    for (const block of input.blocks) {
      const reminder = NODE_TYPE_REMINDERS[block.type] ?? "";
      parts.push(`[${block.type}] ${block.text}${reminder ? `  // ${reminder}` : ""}`);
    }
  } else {
    // Fallback: flat text with single nodeType
    const reminder = NODE_TYPE_REMINDERS[input.nodeType] ?? "";
    parts.push(`=== SELECTED TEXT (${input.nodeType}) ===`);
    parts.push(input.selectedText);
    if (reminder) {
      parts.push(`\n=== NODE TYPE REMINDER ===\n${reminder}`);
    }
  }

  parts.push(`=== CONTEXT AFTER ===`);
  parts.push(input.contextAfter.slice(0, 500));
  parts.push(`=== INSTRUCTION ===`);
  parts.push(input.instruction);

  if (input.previousResult) {
    parts.push(`\n=== PREVIOUS ATTEMPT (do NOT repeat this, provide a DIFFERENT alternative) ===\n${input.previousResult}`);
  }

  if (input.language && input.language !== "en") {
    parts.push(`\n=== LANGUAGE ===\nThe screenplay is written in ${input.language}. Respond in the same language.`);
  }

  return parts.join("\n");
}

export function buildFormatPrompt(input: {
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
  language?: string;
}): string {
  const parts = [
    `=== CONTEXT BEFORE ===`,
    input.contextBefore.slice(-500),
    `=== TEXT TO FORMAT ===`,
    input.selectedText,
    `=== CONTEXT AFTER ===`,
    input.contextAfter.slice(0, 500),
    `\nAnalyze the text above and split it into properly formatted screenplay blocks.`,
  ];

  if (input.language && input.language !== "en") {
    parts.push(`\nThe screenplay is written in ${input.language}. Preserve the language.`);
  }

  return parts.join("\n");
}
