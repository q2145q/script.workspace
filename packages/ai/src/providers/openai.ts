import OpenAI from "openai";
import type { AIProvider, RewriteInput, FormatInput, ProviderConfig, AIRewriteResponse, AIFormatResponse } from "../types";
import { aiRewriteResponseSchema, aiFormatResponseSchema } from "../types";
import { SYSTEM_PROMPT, FORMAT_SYSTEM_PROMPT, buildRewritePrompt, buildFormatPrompt } from "./base";

export class OpenAIProvider implements AIProvider {
  readonly id = "openai" as const;

  async rewrite(input: RewriteInput, config: ProviderConfig): Promise<AIRewriteResponse> {
    const client = new OpenAI({ apiKey: config.apiKey });

    const response = await client.chat.completions.create({
      model: config.model || "gpt-4.1",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildRewritePrompt(input) },
      ],
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("Empty response from OpenAI");

    const parsed = JSON.parse(text);
    return aiRewriteResponseSchema.parse(parsed);
  }

  async format(input: FormatInput, config: ProviderConfig): Promise<AIFormatResponse> {
    const client = new OpenAI({ apiKey: config.apiKey });

    const response = await client.chat.completions.create({
      model: config.model || "gpt-4.1",
      messages: [
        { role: "system", content: FORMAT_SYSTEM_PROMPT },
        { role: "user", content: buildFormatPrompt(input) },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("Empty response from OpenAI");

    const parsed = JSON.parse(text);
    return aiFormatResponseSchema.parse(parsed);
  }
}
