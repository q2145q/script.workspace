import OpenAI from "openai";
import type { AIProvider, RewriteInput, FormatInput, ProviderConfig, AIRewriteResponse, AIFormatResponse } from "../types";
import { aiRewriteResponseSchema, aiFormatResponseSchema } from "../types";
import { buildRewritePrompt, buildFormatPrompt } from "./base";
import { composePrompt } from "../prompts/compose";
import { isFixedTemperatureModel } from "../utils";

export class OpenAIProvider implements AIProvider {
  readonly id = "openai" as const;

  async rewrite(input: RewriteInput, config: ProviderConfig): Promise<AIRewriteResponse> {
    const client = new OpenAI({ apiKey: config.apiKey });
    const systemPrompt = composePrompt(this.id, "rewrite", { USER_LANGUAGE: input.language || "en" });

    const modelId = config.model || "gpt-5";
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
    if (!text) throw new Error("Empty response from OpenAI");

    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { throw new Error("OpenAI returned invalid JSON for rewrite"); }
    return aiRewriteResponseSchema.parse(parsed);
  }

  async format(input: FormatInput, config: ProviderConfig): Promise<AIFormatResponse> {
    const client = new OpenAI({ apiKey: config.apiKey });
    const systemPrompt = composePrompt(this.id, "format", { USER_LANGUAGE: input.language || "en" });

    const fmtModelId = config.model || "gpt-5";
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
    if (!text) throw new Error("Empty response from OpenAI");

    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { throw new Error("OpenAI returned invalid JSON for format"); }
    return aiFormatResponseSchema.parse(parsed);
  }
}
