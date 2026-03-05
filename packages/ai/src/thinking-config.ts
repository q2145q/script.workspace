import type { ProviderId } from "./types";

/** Task types that benefit from extended thinking */
const THINKING_TASKS = new Set([
  "analysis",
  "character-analysis",
  "structure-analysis",
  "knowledge-graph",
]);

/**
 * Returns thinking configuration for a provider + task combination.
 * Only analytics tasks get thinking enabled — chat/rewrite/format do not.
 */
export function getThinkingConfig(
  providerId: ProviderId,
  taskName: string,
): Record<string, unknown> | null {
  if (!THINKING_TASKS.has(taskName)) return null;

  switch (providerId) {
    case "anthropic":
      return { thinking: { type: "enabled", budget_tokens: 8192 } };

    case "gemini": {
      // Gemini 2.5: thinking_budget (int), Gemini 3.x: thinking_level (string)
      return { thinking_budget: 8192 };
    }

    default:
      return null;
  }
}
