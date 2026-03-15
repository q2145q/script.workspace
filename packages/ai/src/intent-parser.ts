import { completeAI } from "./complete";
import { composePrompt } from "./prompts/compose";
import { extractJson } from "./utils";
import type { ProviderConfig } from "./types";

/** Structured intent extracted from user query */
export interface ParsedIntent {
  entities: {
    characters: string[];
    locations: string[];
    themes: string[];
  };
  taskType: "generate_scene" | "rewrite" | "analyze" | "question" | "other";
  timeContext: "past" | "current" | "future" | "any";
}

/** Chat message for intent context */
export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Parse user intent from a query + chat history.
 * Uses GPT-4.1-nano for fast, cheap parsing.
 */
export async function parseIntent(
  query: string,
  chatHistory: ChatHistoryMessage[],
  config: ProviderConfig,
): Promise<ParsedIntent> {
  const historyText = chatHistory.length > 0
    ? chatHistory
        .slice(-10)
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n")
    : "(no history)";

  const systemPrompt = composePrompt("openai", "intent-parser", {
    CHAT_HISTORY: historyText,
    USER_QUERY: query,
  });

  const result = await completeAI("openai", systemPrompt, query, {
    apiKey: config.apiKey,
    model: config.model || "gpt-4.1-nano",
  }, { jsonMode: true });

  const parsed = JSON.parse(extractJson(result.text));

  return {
    entities: {
      characters: Array.isArray(parsed.entities?.characters) ? parsed.entities.characters : [],
      locations: Array.isArray(parsed.entities?.locations) ? parsed.entities.locations : [],
      themes: Array.isArray(parsed.entities?.themes) ? parsed.entities.themes : [],
    },
    taskType: parsed.taskType || "other",
    timeContext: parsed.timeContext || "any",
  };
}

/**
 * Resolve vague character references to concrete names.
 * Uses project character list and recent scene metadata.
 *
 * @param references - Vague references like "the guys", "he", "main character"
 * @param projectCharacters - Known character names from Character table
 * @param sceneCharacters - Characters from recent SceneMetadata
 * @returns Resolved character names
 */
export function resolveCharacterReferences(
  references: string[],
  projectCharacters: string[],
  sceneCharacters: string[],
): string[] {
  const allKnown = [...new Set([...projectCharacters, ...sceneCharacters])];
  const resolved: string[] = [];

  for (const ref of references) {
    // If the reference is already a known character name, keep it
    const exactMatch = allKnown.find(
      (name) => name.toLowerCase() === ref.toLowerCase(),
    );
    if (exactMatch) {
      resolved.push(exactMatch);
      continue;
    }

    // Partial match (e.g., "Ник" -> "Никита")
    const partialMatch = allKnown.find(
      (name) => name.toLowerCase().startsWith(ref.toLowerCase()) ||
                ref.toLowerCase().startsWith(name.toLowerCase()),
    );
    if (partialMatch) {
      resolved.push(partialMatch);
      continue;
    }

    // Keep unresolved references as-is (useful for semantic search)
    resolved.push(ref);
  }

  return [...new Set(resolved)];
}
