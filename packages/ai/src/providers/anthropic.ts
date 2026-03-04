import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, RewriteInput, FormatInput, ProviderConfig, AIRewriteResponse, AIFormatResponse } from "../types";
import { aiRewriteResponseSchema, aiFormatResponseSchema } from "../types";
import { SYSTEM_PROMPT, FORMAT_SYSTEM_PROMPT, buildRewritePrompt, buildFormatPrompt } from "./base";

function stripCodeFences(text: string): string {
  let raw = text.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return raw;
}

export class AnthropicProvider implements AIProvider {
  readonly id = "anthropic" as const;

  async rewrite(input: RewriteInput, config: ProviderConfig): Promise<AIRewriteResponse> {
    const client = new Anthropic({ apiKey: config.apiKey });

    const response = await client.messages.create({
      model: config.model || "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: buildRewritePrompt(input) },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("Empty response from Anthropic");

    const parsed = JSON.parse(stripCodeFences(textBlock.text));
    return aiRewriteResponseSchema.parse(parsed);
  }

  async format(input: FormatInput, config: ProviderConfig): Promise<AIFormatResponse> {
    const client = new Anthropic({ apiKey: config.apiKey });

    const response = await client.messages.create({
      model: config.model || "claude-sonnet-4-6",
      max_tokens: 4096,
      system: FORMAT_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: buildFormatPrompt(input) },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("Empty response from Anthropic");

    const parsed = JSON.parse(stripCodeFences(textBlock.text));
    return aiFormatResponseSchema.parse(parsed);
  }
}
