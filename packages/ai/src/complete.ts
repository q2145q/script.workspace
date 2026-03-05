import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { ProviderConfig, ProviderId, StreamUsageResult } from "./types";

/** Result from a non-streaming AI completion */
export interface CompleteResult {
  text: string;
  usage: StreamUsageResult;
}

/** Estimate tokens from text length (~4 chars per token) */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Base URL mapping for OpenAI-compatible providers */
const OPENAI_COMPATIBLE_BASE_URLS: Partial<Record<ProviderId, string>> = {
  deepseek: "https://api.deepseek.com",
  grok: "https://api.x.ai/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
};

const OPENAI_COMPATIBLE_DEFAULTS: Partial<Record<ProviderId, string>> = {
  openai: "gpt-4.1",
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
): Promise<CompleteResult> {
  const startTime = Date.now();
  const client = new OpenAI({ apiKey: config.apiKey, ...(baseURL ? { baseURL } : {}) });
  const modelId = config.model || defaultModel || "gpt-4.1";
  const isReasoner = modelId.includes("reasoner");

  const response = await client.chat.completions.create({
    model: modelId,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    ...(isReasoner ? {} : { temperature: 0.7 }),
    max_tokens: 8192,
  });

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
): Promise<CompleteResult> {
  const startTime = Date.now();
  const client = new Anthropic({ apiKey: config.apiKey });

  const response = await client.messages.create({
    model: config.model || "claude-sonnet-4-6",
    max_tokens: 8192,
    system: [
      {
        type: "text" as const,
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      } as Anthropic.TextBlockParam,
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

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
        completionOptions: { stream: false, temperature: 0.7, maxTokens: 8192 },
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
 */
export async function completeAI(
  providerId: ProviderId,
  systemPrompt: string,
  userPrompt: string,
  config: ProviderConfig,
): Promise<CompleteResult> {
  if (providerId === "anthropic") {
    return completeAnthropic(systemPrompt, userPrompt, config);
  }

  if (providerId === "yandex") {
    return completeYandex(systemPrompt, userPrompt, config);
  }

  // OpenAI-compatible: openai, deepseek, grok, gemini
  const baseURL = OPENAI_COMPATIBLE_BASE_URLS[providerId];
  const defaultModel = OPENAI_COMPATIBLE_DEFAULTS[providerId];
  return completeOpenAI(systemPrompt, userPrompt, config, baseURL, defaultModel);
}
