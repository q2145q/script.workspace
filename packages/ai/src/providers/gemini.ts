import OpenAI from "openai";
import type { AIProvider, RewriteInput, FormatInput, ProviderConfig, AIRewriteResponse, AIFormatResponse } from "../types";
import { aiRewriteResponseSchema, aiFormatResponseSchema } from "../types";
import { buildRewritePrompt, buildFormatPrompt } from "./base";
import { composePrompt } from "../prompts/compose";
import { isFixedTemperatureModel } from "../utils";

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

    const modelId = config.model || "gemini-2.5-flash";
    const response = await client.chat.completions.create({
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildRewritePrompt(input) },
      ],
      ...(isFixedTemperatureModel(modelId) ? {} : { temperature: 0.7 }),
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("Empty response from Gemini");

    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { throw new Error("Gemini returned invalid JSON for rewrite"); }
    return aiRewriteResponseSchema.parse(parsed);
  }

  async format(input: FormatInput, config: ProviderConfig): Promise<AIFormatResponse> {
    const client = this.getClient(config.apiKey);
    const systemPrompt = composePrompt(this.id, "format", { USER_LANGUAGE: input.language || "en" });

    const fmtModelId = config.model || "gemini-2.5-flash";
    const response = await client.chat.completions.create({
      model: fmtModelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildFormatPrompt(input) },
      ],
      ...(isFixedTemperatureModel(fmtModelId) ? {} : { temperature: 0.3 }),
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("Empty response from Gemini");

    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { throw new Error("Gemini returned invalid JSON for format"); }
    return aiFormatResponseSchema.parse(parsed);
  }
}
