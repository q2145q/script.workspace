import { z } from "zod";

/** Supported AI providers */
export const ProviderIdEnum = z.enum(["openai", "anthropic", "deepseek", "gemini", "yandex", "grok"]);
export type ProviderId = z.infer<typeof ProviderIdEnum>;

/** Token usage result from a streaming/non-streaming AI call */
export interface StreamUsageResult {
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
}

/** A single patch operation returned by AI */
export const patchOperationSchema = z.object({
  type: z.enum(["replace", "insert", "delete"]),
  from: z.number().int().min(0),
  to: z.number().int().min(0),
  content: z.string().optional(),
  nodeType: z.string().optional(),
});
export type PatchOperation = z.infer<typeof patchOperationSchema>;

/** Full AI rewrite response — typed blocks */
export const aiRewriteResponseSchema = z.object({
  blocks: z.array(z.object({
    type: z.string(),
    text: z.string(),
  })),
  explanation: z.string().nullable(),
});
export type AIRewriteResponse = z.infer<typeof aiRewriteResponseSchema>;

/** Input to the AI rewrite call */
export interface RewriteInput {
  selectedText: string;
  instruction: string;
  contextBefore: string;
  contextAfter: string;
  nodeType: string;
  blocks?: Array<{ type: string; text: string }>;
  previousResult?: string;
  language?: string;
}

/** Configuration for a provider */
export interface ProviderConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
}

/** A screenplay block in a format response */
export const formatBlockSchema = z.object({
  type: z.enum(["sceneHeading", "action", "character", "dialogue", "parenthetical", "transition"]),
  text: z.string(),
});
export type FormatBlock = z.infer<typeof formatBlockSchema>;

/** AI format response — structured screenplay blocks */
export const aiFormatResponseSchema = z.object({
  blocks: z.array(formatBlockSchema),
  explanation: z.string().nullable(),
});
export type AIFormatResponse = z.infer<typeof aiFormatResponseSchema>;

/** Input to the AI format call */
export interface FormatInput {
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
  language?: string;
}

/** Task types for AI operations */
export type AITaskType =
  | "chat"
  | "rewrite"
  | "format"
  | "analysis"
  | "character-analysis"
  | "structure-analysis"
  | "logline"
  | "synopsis"
  | "describe-character"
  | "describe-location"
  | "knowledge-graph";

/** The abstract interface every provider must implement */
export interface AIProvider {
  readonly id: ProviderId;
  rewrite(input: RewriteInput, config: ProviderConfig): Promise<AIRewriteResponse>;
  format(input: FormatInput, config: ProviderConfig): Promise<AIFormatResponse>;
}
