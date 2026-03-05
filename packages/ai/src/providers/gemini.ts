import OpenAI from "openai";
import type { AIProvider, RewriteInput, FormatInput, ProviderConfig, AIRewriteResponse, AIFormatResponse } from "../types";
import { aiRewriteResponseSchema, aiFormatResponseSchema } from "../types";
import { buildRewritePrompt, buildFormatPrompt } from "./base";
import { composePrompt } from "../prompts/compose";

/**
 * Gemini provider — uses Google's OpenAI-compatible REST endpoint.
 * https://ai.google.dev/gemini-api/docs/openai
 */
export class GeminiProvider implements AIProvider {
  readonly id = "gemini" as const;

  private getClient(apiKey: string) {
    return new OpenAI({
      apiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }

  async rewrite(input: RewriteInput, config: ProviderConfig): Promise<AIRewriteResponse> {
    const client = this.getClient(config.apiKey);
    const systemPrompt = composePrompt(this.id, "rewrite", { USER_LANGUAGE: input.language || "en" });

    const response = await client.chat.completions.create({
      model: config.model || "gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildRewritePrompt(input) },
      ],
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("Empty response from Gemini");

    const parsed = JSON.parse(text);
    return aiRewriteResponseSchema.parse(parsed);
  }

  async format(input: FormatInput, config: ProviderConfig): Promise<AIFormatResponse> {
    const client = this.getClient(config.apiKey);
    const systemPrompt = composePrompt(this.id, "format", { USER_LANGUAGE: input.language || "en" });

    const response = await client.chat.completions.create({
      model: config.model || "gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildFormatPrompt(input) },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("Empty response from Gemini");

    const parsed = JSON.parse(text);
    return aiFormatResponseSchema.parse(parsed);
  }
}
