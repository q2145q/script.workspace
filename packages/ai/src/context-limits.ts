import type { ProviderId } from "./types";

/** Context window sizes (in tokens) per provider/model */
const CONTEXT_WINDOWS: Record<string, number> = {
  // Gemini
  "gemini:gemini-2.5-pro": 2_000_000,
  "gemini:gemini-2.5-flash": 1_000_000,
  "gemini:gemini-2.0-flash": 1_000_000,
  "gemini:default": 1_000_000,

  // Anthropic
  "anthropic:claude-sonnet-4-6": 200_000,
  "anthropic:claude-haiku-4-5-20251001": 200_000,
  "anthropic:default": 200_000,

  // OpenAI
  "openai:gpt-5": 1_000_000,
  "openai:gpt-5-mini": 1_000_000,
  "openai:gpt-5-nano": 1_000_000,
  "openai:default": 1_000_000,

  // DeepSeek
  "deepseek:deepseek-chat": 64_000,
  "deepseek:default": 64_000,

  // Grok
  "grok:grok-3": 131_072,
  "grok:grok-3-mini": 131_072,
  "grok:default": 131_072,

  // Yandex
  "yandex:yandexgpt/latest": 32_000,
  "yandex:default": 32_000,
};

/** Safety margin — reserve tokens for system prompt + output */
const SAFETY_MARGIN = 0.75;

/**
 * Get effective context window (in tokens) for a provider/model combination.
 * Returns the usable input token limit (after safety margin).
 */
export function getEffectiveLimit(providerId: ProviderId, model?: string): number {
  const key = model ? `${providerId}:${model}` : null;
  const raw = (key && CONTEXT_WINDOWS[key]) || CONTEXT_WINDOWS[`${providerId}:default`] || 128_000;
  return Math.floor(raw * SAFETY_MARGIN);
}

/**
 * Check whether text fits within a provider's context window.
 * Uses a conservative chars-to-tokens estimate.
 */
export function fitsInContext(
  text: string,
  providerId: ProviderId,
  model?: string,
): boolean {
  const limit = getEffectiveLimit(providerId, model);
  const hasCyrillic = /[\u0400-\u04FF]/.test(text);
  const charsPerToken = hasCyrillic ? 2 : 4;
  const estimatedTokens = Math.ceil(text.length / charsPerToken);
  return estimatedTokens <= limit;
}

/**
 * Get a human-friendly description of the provider's context limit.
 */
export function getContextLimitInfo(providerId: ProviderId, model?: string): {
  rawTokens: number;
  effectiveTokens: number;
} {
  const key = model ? `${providerId}:${model}` : null;
  const rawTokens = (key && CONTEXT_WINDOWS[key]) || CONTEXT_WINDOWS[`${providerId}:default`] || 128_000;
  return {
    rawTokens,
    effectiveTokens: Math.floor(rawTokens * SAFETY_MARGIN),
  };
}
