import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { ProviderConfig, ProviderId, StreamUsageResult } from "./types";
import { estimateTokens, isFixedTemperatureModel } from "./utils";

/** Options for AI completion */
export interface CompleteOptions {
  /** When true, enforce JSON output (response_format for OpenAI, prefill for Anthropic) */
  jsonMode?: boolean;
}

/** Result from a non-streaming AI completion */
export interface CompleteResult {
  text: string;
  usage: StreamUsageResult;
}

/** Base URL mapping for OpenAI-compatible providers */
const OPENAI_COMPATIBLE_BASE_URLS: Partial<Record<ProviderId, string>> = {
  deepseek: "https://api.deepseek.com",
  grok: "https://api.x.ai/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
};

const OPENAI_COMPATIBLE_DEFAULTS: Partial<Record<ProviderId, string>> = {
  openai: "gpt-5",
  deepseek: "deepseek-chat",
  grok: "grok-3",
  gemini: "gemini-2.5-flash",
};

async function completeOpenAI(
  systemPrompt: string,
  userPrompt: string,
  config: ProviderConfig,
  baseURL?: string,
  defaultModel?: string,
  options?: CompleteOptions,
): Promise<CompleteResult> {
  const startTime = Date.now();
  const client = new OpenAI({ apiKey: config.apiKey, ...(baseURL ? { baseURL } : {}) });
  const modelId = config.model || defaultModel || "gpt-5";
  const response = await client.chat.completions.create(
    {
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      ...(isFixedTemperatureModel(modelId) ? {} : { temperature: 0.7 }),
      ...(options?.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
    },
    { signal: AbortSignal.timeout(120_000) },
  );

  const text = response.choices[0]?.message?.content || "";
  const usage: StreamUsageResult = {
    tokensIn: response.usage?.prompt_tokens ?? estimateTokens(systemPrompt + userPrompt),
    tokensOut: response.usage?.completion_tokens ?? estimateTokens(text),
    durationMs: Date.now() - startTime,
  };

  return { text, usage };
}

async function completeAnthropic(
  systemPrompt: string,
  userPrompt: string,
  config: ProviderConfig,
  options?: CompleteOptions,
): Promise<CompleteResult> {
  const startTime = Date.now();
  const client = new Anthropic({ apiKey: config.apiKey });

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }];
  // JSON prefill: start assistant response with "{" to force JSON output
  if (options?.jsonMode) {
    messages.push({ role: "assistant", content: "{" });
  }

  const response = await client.messages.create(
    {
      model: config.model || "claude-haiku-4-5-20251001",
      max_tokens: 16384,
      system: [
        {
          type: "text" as const,
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        } as Anthropic.TextBlockParam,
      ],
      messages,
    },
    { signal: AbortSignal.timeout(120_000) },
  );

  const textBlock = response.content.find((b) => b.type === "text");
  let text = textBlock && textBlock.type === "text" ? textBlock.text : "";
  // Prepend the prefilled "{" back to complete the JSON
  if (options?.jsonMode) {
    text = "{" + text;
  }

  return {
    text,
    usage: {
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
      durationMs: Date.now() - startTime,
    },
  };
}

async function completeYandex(
  systemPrompt: string,
  userPrompt: string,
  config: ProviderConfig,
): Promise<CompleteResult> {
  const startTime = Date.now();
  const model = config.model || "yandexgpt/latest";
  const folderId = process.env.YANDEX_FOLDER_ID;
  if (!folderId) throw new Error("YANDEX_FOLDER_ID environment variable is not set");
  const modelUri = model.startsWith("gpt://") ? model : `gpt://${folderId}/${model}`;

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
        completionOptions: { stream: false, temperature: 0.7 },
        messages: [
          { role: "system", text: systemPrompt },
          { role: "user", text: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(120_000),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Yandex API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const text = data?.result?.alternatives?.[0]?.message?.text || "";

  return {
    text,
    usage: {
      tokensIn: Number(data?.result?.usage?.inputTextTokens) || estimateTokens(systemPrompt + userPrompt),
      tokensOut: Number(data?.result?.usage?.completionTokens) || estimateTokens(text),
      durationMs: Date.now() - startTime,
    },
  };
}

/**
 * Unified non-streaming completion — sends system + user prompt, returns text.
 * Used by analysis, logline, synopsis, and other non-streaming AI features.
 * Pass options.jsonMode = true to enforce JSON output across all providers.
 */
export async function completeAI(
  providerId: ProviderId,
  systemPrompt: string,
  userPrompt: string,
  config: ProviderConfig,
  options?: CompleteOptions,
): Promise<CompleteResult> {
  if (providerId === "anthropic") {
    return completeAnthropic(systemPrompt, userPrompt, config, options);
  }

  if (providerId === "yandex") {
    return completeYandex(systemPrompt, userPrompt, config);
  }

  // OpenAI-compatible: openai, deepseek, grok, gemini
  const baseURL = OPENAI_COMPATIBLE_BASE_URLS[providerId];
  const defaultModel = OPENAI_COMPATIBLE_DEFAULTS[providerId];
  return completeOpenAI(systemPrompt, userPrompt, config, baseURL, defaultModel, options);
}
