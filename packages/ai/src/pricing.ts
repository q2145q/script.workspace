/**
 * Token pricing per 1M tokens (USD) for each model.
 * Updated: 2026-03.
 */
export const TOKEN_PRICES: Record<string, { input: number; output: number }> = {
  // OpenAI
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
  "o4-mini": { input: 1.1, output: 4.4 },

  // Anthropic
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-3-5": { input: 0.8, output: 4 },

  // DeepSeek
  "deepseek-chat": { input: 0.27, output: 1.1 },
  "deepseek-reasoner": { input: 0.55, output: 2.19 },

  // Google Gemini
  "gemini-2.5-flash": { input: 0.15, output: 0.6 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },

  // Grok (xAI)
  "grok-3": { input: 3, output: 15 },
  "grok-3-mini": { input: 0.3, output: 0.5 },

  // Yandex GPT
  "yandexgpt/latest": { input: 0.32, output: 0.64 },
};

/**
 * Estimate cost in USD for a given number of input/output tokens on a specific model.
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string,
): number {
  const price = TOKEN_PRICES[model];
  if (!price) return 0;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

/**
 * Format cost for display: "$0.003" or "< $0.001"
 */
export function formatCost(cost: number): string {
  if (cost === 0) return "";
  if (cost < 0.001) return "< $0.001";
  return `≈ $${cost.toFixed(3)}`;
}

/**
 * Format token count for display: "2 500" (with space separator)
 */
export function formatTokens(tokens: number): string {
  return tokens.toLocaleString("ru-RU");
}
