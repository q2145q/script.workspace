import type { ProviderId } from "./types";

/**
 * Pricing tier for model selection.
 * - best: premium plan (default during test period)
 * - middle: paid plan
 * - cheap: free plan
 */
export type ModelTier = "best" | "middle" | "cheap";

/** A provider + model pair for a specific task */
export interface TaskModelEntry {
  provider: ProviderId;
  model: string;
}

/**
 * Per-task model configuration based on benchmark results.
 * First entry in each tier array is the primary (default) model.
 * Remaining entries are fallbacks tried in order if the primary provider is unavailable.
 */
export const TASK_MODEL_CONFIG: Record<string, Record<ModelTier, TaskModelEntry[]>> = {
  rewrite: {
    best: [
      { provider: "anthropic", model: "claude-sonnet-4-6" },
    ],
    middle: [
      { provider: "openai", model: "gpt-5-mini" },
      { provider: "openai", model: "gpt-4.1" },
    ],
    cheap: [
      { provider: "deepseek", model: "deepseek-chat" },
      { provider: "openai", model: "gpt-4.1-nano" },
    ],
  },

  format: {
    best: [
      { provider: "openai", model: "gpt-4o-mini" },
    ],
    middle: [
      { provider: "openai", model: "gpt-4o-mini" },
    ],
    cheap: [
      { provider: "openai", model: "gpt-4o-mini" },
    ],
  },

  "dialogue-pass": {
    best: [
      { provider: "openai", model: "gpt-4.1-nano" },
    ],
    middle: [
      { provider: "openai", model: "gpt-4.1-nano" },
    ],
    cheap: [
      { provider: "openai", model: "gpt-4.1-nano" },
    ],
  },

  analysis: {
    best: [
      { provider: "openai", model: "gpt-4.1-nano" },
    ],
    middle: [
      { provider: "openai", model: "gpt-4.1-nano" },
    ],
    cheap: [
      { provider: "deepseek", model: "deepseek-chat" },
    ],
  },

  "character-analysis": {
    best: [
      { provider: "openai", model: "gpt-5-nano" },
      { provider: "openai", model: "gpt-4.1" },
    ],
    middle: [
      { provider: "openai", model: "gpt-5-nano" },
    ],
    cheap: [
      { provider: "openai", model: "gpt-4.1-nano" },
    ],
  },

  "structure-analysis": {
    best: [
      { provider: "openai", model: "gpt-4.1" },
      { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
    ],
    middle: [
      { provider: "openai", model: "gpt-4.1-mini" },
    ],
    cheap: [
      { provider: "deepseek", model: "deepseek-chat" },
    ],
  },

  "beat-sheet": {
    best: [
      { provider: "openai", model: "gpt-4.1" },
    ],
    middle: [
      { provider: "openai", model: "gpt-4.1-mini" },
    ],
    cheap: [
      { provider: "openai", model: "gpt-5-nano" },
    ],
  },

  logline: {
    best: [
      { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
      { provider: "openai", model: "gpt-4.1" },
    ],
    middle: [
      { provider: "openai", model: "gpt-4.1" },
    ],
    cheap: [
      { provider: "openai", model: "gpt-4.1-nano" },
    ],
  },

  synopsis: {
    best: [
      { provider: "openai", model: "gpt-4.1" },
    ],
    middle: [
      { provider: "openai", model: "gpt-5-mini" },
    ],
    cheap: [
      { provider: "openai", model: "gpt-4.1-nano" },
    ],
  },

  "consistency-check": {
    best: [
      { provider: "openai", model: "gpt-4.1" },
    ],
    middle: [
      { provider: "openai", model: "gpt-4.1-mini" },
    ],
    cheap: [
      { provider: "openai", model: "gpt-4o-mini" },
    ],
  },

  "pacing-analysis": {
    best: [
      { provider: "openai", model: "gpt-4.1" },
      { provider: "anthropic", model: "claude-sonnet-4-5-20250929" },
    ],
    middle: [
      { provider: "openai", model: "gpt-4.1-mini" },
    ],
    cheap: [
      { provider: "deepseek", model: "deepseek-chat" },
    ],
  },

  "scene-synopsis": {
    best: [
      { provider: "anthropic", model: "claude-sonnet-4-5-20250929" },
    ],
    middle: [
      { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
      { provider: "openai", model: "gpt-5-mini" },
    ],
    cheap: [
      { provider: "anthropic", model: "claude-opus-4-20250514" },
    ],
  },

  "describe-character": {
    best: [
      { provider: "anthropic", model: "claude-sonnet-4-6" },
      { provider: "openai", model: "gpt-4.1-mini" },
    ],
    middle: [
      { provider: "openai", model: "gpt-4.1-mini" },
      { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
    ],
    cheap: [
      { provider: "deepseek", model: "deepseek-chat" },
    ],
  },

  "describe-location": {
    best: [
      { provider: "openai", model: "gpt-4.1" },
      { provider: "anthropic", model: "claude-sonnet-4-6" },
    ],
    middle: [
      { provider: "openai", model: "gpt-4.1" },
      { provider: "anthropic", model: "claude-sonnet-4-20250514" },
    ],
    cheap: [
      { provider: "deepseek", model: "deepseek-chat" },
    ],
  },

  "knowledge-graph": {
    best: [
      { provider: "openai", model: "gpt-4o" },
    ],
    middle: [
      { provider: "openai", model: "gpt-4.1-nano" },
      { provider: "openai", model: "gpt-4o-mini" },
    ],
    cheap: [],
  },

  "act-assignment": {
    best: [
      { provider: "anthropic", model: "claude-opus-4-20250514" },
      { provider: "openai", model: "gpt-5" },
      { provider: "openai", model: "gpt-5-mini" },
    ],
    middle: [
      { provider: "deepseek", model: "deepseek-chat" },
      { provider: "openai", model: "gpt-4.1-mini" },
    ],
    cheap: [
      { provider: "openai", model: "gpt-4.1-nano" },
    ],
  },
};

/**
 * Get the primary model for a task at a given tier.
 * Returns the first entry from the tier's model list.
 * Falls back to "best" tier if the requested tier has no entries.
 */
export function getTaskModel(taskName: string, tier: ModelTier = "best"): TaskModelEntry | null {
  const config = TASK_MODEL_CONFIG[taskName];
  if (!config) return null;

  const entries = config[tier];
  if (entries && entries.length > 0) return entries[0];

  // Fallback to best tier
  if (tier !== "best" && config.best.length > 0) return config.best[0];

  return null;
}

/**
 * Get all model entries for a task at a given tier (for fallback resolution).
 */
export function getTaskModels(taskName: string, tier: ModelTier = "best"): TaskModelEntry[] {
  const config = TASK_MODEL_CONFIG[taskName];
  if (!config) return [];
  return config[tier] ?? config.best ?? [];
}
