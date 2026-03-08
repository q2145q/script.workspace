/**
 * Client-side token & cost estimation utilities.
 * Pure functions — no server dependencies.
 */

/** Estimate token count from text. Cyrillic/CJK ≈ 2 chars/token, Latin ≈ 4 chars/token. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const hasCyrillic = /[\u0400-\u04FF]/.test(text);
  const divisor = hasCyrillic ? 2 : 4;
  return Math.ceil(text.length / divisor);
}

/** Pricing per 1M tokens (USD). Subset of common models. */
const TOKEN_PRICES: Record<string, { input: number; output: number }> = {
  "gpt-5": { input: 1.25, output: 10 },
  "gpt-5-mini": { input: 0.25, output: 2 },
  "gpt-5-nano": { input: 0.05, output: 0.4 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
  "deepseek-chat": { input: 0.28, output: 0.42 },
  "gemini-2.5-flash": { input: 0.15, output: 0.6 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
  "grok-3": { input: 3, output: 15 },
  "grok-3-mini": { input: 0.3, output: 0.5 },
  "yandexgpt/latest": { input: 0.32, output: 0.64 },
};

/** Estimate cost for a given model and text. Assumes output ≈ input tokens for chat. */
export function estimateChatCost(inputText: string, model: string | null | undefined): string {
  if (!model || !inputText) return "";
  const price = TOKEN_PRICES[model];
  if (!price) return "";

  const inputTokens = estimateTokens(inputText);
  // Assume output ≈ same as input for estimation
  const cost = (inputTokens * price.input + inputTokens * price.output) / 1_000_000;

  const tokensStr = inputTokens.toLocaleString("ru-RU");
  if (cost < 0.001) return `~${tokensStr} tokens · < $0.001`;
  return `~${tokensStr} tokens · ≈ $${cost.toFixed(3)}`;
}

/** Quick token estimate display without cost. */
export function formatTokenEstimate(text: string): string {
  const tokens = estimateTokens(text);
  return `~${tokens.toLocaleString("ru-RU")} tokens`;
}
