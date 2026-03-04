import { z } from "zod";

export const ProviderIdEnum = z.enum(["openai", "anthropic"]);

/** Available models per provider — keep in sync with latest API offerings */
export const PROVIDER_MODELS: Record<
  "openai" | "anthropic",
  Array<{ id: string; label: string; description: string }>
> = {
  openai: [
    { id: "gpt-4.1", label: "GPT-4.1", description: "Best balance of cost & capability" },
    { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", description: "Fast & affordable" },
    { id: "gpt-4.1-nano", label: "GPT-4.1 Nano", description: "Fastest, lowest cost" },
    { id: "gpt-4o", label: "GPT-4o", description: "Previous generation" },
    { id: "gpt-4o-mini", label: "GPT-4o Mini", description: "Previous gen, affordable" },
    { id: "o3", label: "o3", description: "Reasoning model" },
    { id: "o4-mini", label: "o4-mini", description: "Fast reasoning model" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", description: "Fast + intelligent" },
    { id: "claude-opus-4-6", label: "Claude Opus 4.6", description: "Most capable" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", description: "Fastest, low cost" },
    { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5", description: "Previous generation" },
  ],
};

export const configureProviderSchema = z.object({
  projectId: z.string(),
  provider: ProviderIdEnum,
  apiKey: z.string().min(1, "API key is required"),
  model: z.string().optional(),
});
export type ConfigureProviderInput = z.infer<typeof configureProviderSchema>;

export const removeProviderSchema = z.object({
  projectId: z.string(),
  provider: ProviderIdEnum,
});

export const listProvidersSchema = z.object({
  projectId: z.string(),
});

export const updateProviderModelSchema = z.object({
  projectId: z.string(),
  provider: ProviderIdEnum,
  model: z.string().min(1),
});

export const rewriteSchema = z.object({
  documentId: z.string(),
  selectionFrom: z.number().int().min(0),
  selectionTo: z.number().int().min(0),
  selectedText: z.string().min(1),
  instruction: z.string().min(1).max(2000),
  contextBefore: z.string().max(2000).default(""),
  contextAfter: z.string().max(2000).default(""),
  nodeType: z.string().default("action"),
  previousResult: z.string().optional(),
});
export type RewriteInput = z.infer<typeof rewriteSchema>;

export const formatSchema = z.object({
  documentId: z.string(),
  selectionFrom: z.number().int().min(0),
  selectionTo: z.number().int().min(0),
  selectedText: z.string().min(1),
  contextBefore: z.string().max(2000).default(""),
  contextAfter: z.string().max(2000).default(""),
});
export type FormatInput = z.infer<typeof formatSchema>;

export const suggestionActionSchema = z.object({
  id: z.string(),
});

export const listSuggestionsSchema = z.object({
  documentId: z.string(),
  status: z.enum(["PENDING", "APPLIED", "REJECTED", "UNDONE"]).optional(),
});
