import type { AIProvider, RewriteInput, FormatInput, ProviderConfig, AIRewriteResponse, AIFormatResponse } from "../types";
import { aiRewriteResponseSchema, aiFormatResponseSchema } from "../types";
import { buildRewritePrompt, buildFormatPrompt } from "./base";
import { composePrompt } from "../prompts/compose";

/**
 * Yandex GPT provider — uses the Yandex Cloud Foundation Models REST API.
 * API key format: "Api-Key <IAM-token>" or "Bearer <IAM-token>"
 * The `apiKey` field should contain the full IAM API key.
 */
export class YandexProvider implements AIProvider {
  readonly id = "yandex" as const;

  private async complete(
    systemPrompt: string,
    userPrompt: string,
    config: ProviderConfig,
    temperature: number,
  ): Promise<string> {
    const model = config.model || "yandexgpt/latest";
    const folderId = process.env.YANDEX_FOLDER_ID;
    if (!folderId) throw new Error("YANDEX_FOLDER_ID environment variable is not set");
    const modelUri = model.startsWith("gpt://")
      ? model
      : `gpt://${folderId}/${model}`;

    const response = await fetch(
      "https://llm.api.cloud.yandex.net/foundationModels/v1/completion",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: config.apiKey.startsWith("Api-Key") || config.apiKey.startsWith("Bearer")
            ? config.apiKey
            : `Api-Key ${config.apiKey}`,
        },
        body: JSON.stringify({
          modelUri,
          completionOptions: {
            stream: false,
            temperature,
            maxTokens: 4096,
          },
          messages: [
            { role: "system", text: systemPrompt },
            { role: "user", text: userPrompt },
          ],
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Yandex API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const text = data?.result?.alternatives?.[0]?.message?.text;
    if (!text) throw new Error("Empty response from Yandex");
    return text;
  }

  async rewrite(input: RewriteInput, config: ProviderConfig): Promise<AIRewriteResponse> {
    const systemPrompt = composePrompt(this.id, "rewrite", { USER_LANGUAGE: input.language || "en" });
    const text = await this.complete(systemPrompt, buildRewritePrompt(input), config, 0.7);
    let clean = text.trim();
    if (clean.startsWith("```")) {
      clean = clean.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const parsed = JSON.parse(clean);
    return aiRewriteResponseSchema.parse(parsed);
  }

  async format(input: FormatInput, config: ProviderConfig): Promise<AIFormatResponse> {
    const systemPrompt = composePrompt(this.id, "format", { USER_LANGUAGE: input.language || "en" });
    const text = await this.complete(systemPrompt, buildFormatPrompt(input), config, 0.3);
    let clean = text.trim();
    if (clean.startsWith("```")) {
      clean = clean.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const parsed = JSON.parse(clean);
    return aiFormatResponseSchema.parse(parsed);
  }
}
