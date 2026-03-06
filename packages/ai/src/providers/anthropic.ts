import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, RewriteInput, FormatInput, ProviderConfig, AIRewriteResponse, AIFormatResponse } from "../types";
import { aiRewriteResponseSchema, aiFormatResponseSchema } from "../types";
import { buildRewritePrompt, buildFormatPrompt } from "./base";
import { composePrompt } from "../prompts/compose";
import { stripCodeFences } from "../utils";

export class AnthropicProvider implements AIProvider {
  readonly id = "anthropic" as const;

  async rewrite(input: RewriteInput, config: ProviderConfig): Promise<AIRewriteResponse> {
    const client = new Anthropic({ apiKey: config.apiKey });
    const systemPrompt = composePrompt(this.id, "rewrite", { USER_LANGUAGE: input.language || "en" });

    const response = await client.messages.create({
      model: config.model || "claude-sonnet-4-6",
      max_tokens: 4096,
      system: [
        {
          type: "text" as const,
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        } as Anthropic.TextBlockParam,
      ],
      messages: [
        { role: "user", content: buildRewritePrompt(input) },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("Empty response from Anthropic");

    let parsed: unknown;
    try { parsed = JSON.parse(stripCodeFences(textBlock.text)); } catch { throw new Error("Anthropic returned invalid JSON for rewrite"); }
    return aiRewriteResponseSchema.parse(parsed);
  }

  async format(input: FormatInput, config: ProviderConfig): Promise<AIFormatResponse> {
    const client = new Anthropic({ apiKey: config.apiKey });
    const systemPrompt = composePrompt(this.id, "format", { USER_LANGUAGE: input.language || "en" });

    const response = await client.messages.create({
      model: config.model || "claude-sonnet-4-6",
      max_tokens: 4096,
      system: [
        {
          type: "text" as const,
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        } as Anthropic.TextBlockParam,
      ],
      messages: [
        { role: "user", content: buildFormatPrompt(input) },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("Empty response from Anthropic");

    let parsed: unknown;
    try { parsed = JSON.parse(stripCodeFences(textBlock.text)); } catch { throw new Error("Anthropic returned invalid JSON for format"); }
    return aiFormatResponseSchema.parse(parsed);
  }
}
