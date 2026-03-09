import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { AIProvider, RewriteInput, FormatInput, ProviderConfig, AIRewriteResponse, AIFormatResponse, ProviderId } from "../types";
import { aiRewriteResponseSchema, aiFormatResponseSchema } from "../types";
import { buildRewritePrompt, buildFormatPrompt } from "./base";
import { composePrompt } from "../prompts/compose";
import { isFixedTemperatureModel } from "../utils";

export class OpenAICompatibleProvider implements AIProvider {
  constructor(
    public readonly id: ProviderId,
    private readonly baseURL: string,
    private readonly defaultModel: string,
    private readonly supportsJsonSchema: boolean = false,
  ) {}

  async rewrite(input: RewriteInput, config: ProviderConfig): Promise<AIRewriteResponse> {
    const client = new OpenAI({ apiKey: config.apiKey, baseURL: this.baseURL });
    const systemPrompt = composePrompt(this.id, "rewrite", { USER_LANGUAGE: input.language || "en" });
    const modelId = config.model || this.defaultModel;

    const response = await client.chat.completions.create({
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildRewritePrompt(input) },
      ],
      ...(isFixedTemperatureModel(modelId) ? {} : { temperature: 0.7 }),
      response_format: this.supportsJsonSchema
        ? zodResponseFormat(aiRewriteResponseSchema, "rewrite_response")
        : { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error(`Empty response from ${this.id}`);

    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { throw new Error(`${this.id} returned invalid JSON for rewrite`); }
    return aiRewriteResponseSchema.parse(parsed);
  }

  async format(input: FormatInput, config: ProviderConfig): Promise<AIFormatResponse> {
    const client = new OpenAI({ apiKey: config.apiKey, baseURL: this.baseURL });
    const systemPrompt = composePrompt(this.id, "format", { USER_LANGUAGE: input.language || "en" });
    const modelId = config.model || this.defaultModel;

    const response = await client.chat.completions.create({
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildFormatPrompt(input) },
      ],
      ...(isFixedTemperatureModel(modelId) ? {} : { temperature: 0.3 }),
      response_format: this.supportsJsonSchema
        ? zodResponseFormat(aiFormatResponseSchema, "format_response")
        : { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error(`Empty response from ${this.id}`);

    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { throw new Error(`${this.id} returned invalid JSON for format`); }
    return aiFormatResponseSchema.parse(parsed);
  }
}
