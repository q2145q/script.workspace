import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { ProviderConfig, ProviderId, StreamUsageResult } from "./types";

export interface ChatStreamInput {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  systemPrompt: string;
  contextBlocks: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string, usage?: StreamUsageResult) => void;
  onError: (error: Error) => void;
}

/**
 * Prepend context blocks to the last user message so the AI always has project context.
 */
function buildMessagesWithContext(
  input: ChatStreamInput
): Array<{ role: "user" | "assistant"; content: string }> {
  const messages = [...input.messages];
  if (messages.length === 0) return messages;

  // Find the last user message and prepend context
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      if (input.contextBlocks) {
        messages[i] = {
          ...messages[i],
          content: `${messages[i].content}\n\n---\n\n${input.contextBlocks}`,
        };
      }
      break;
    }
  }

  return messages;
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

export async function streamChatOpenAI(
  input: ChatStreamInput,
  config: ProviderConfig,
  callbacks: StreamCallbacks,
  baseURL?: string,
  defaultModel?: string,
): Promise<void> {
  const startTime = Date.now();
  const client = new OpenAI({ apiKey: config.apiKey, ...(baseURL ? { baseURL } : {}) });
  const messages = buildMessagesWithContext(input);

  const systemMessages = input.systemPrompt
    ? [{ role: "system" as const, content: input.systemPrompt }]
    : [];

  const modelId = config.model || defaultModel || "gpt-4.1";
  const isReasoner = modelId.includes("reasoner");

  const stream = await client.chat.completions.create({
    model: modelId,
    messages: [
      ...systemMessages,
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
    stream: true,
    stream_options: { include_usage: true },
    ...(isReasoner ? {} : { temperature: 0.7 }),
    max_tokens: 4096,
  });

  let fullText = "";
  let usage: StreamUsageResult | undefined;

  try {
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        callbacks.onToken(delta);
      }
      // Last chunk contains usage
      if (chunk.usage) {
        usage = {
          tokensIn: chunk.usage.prompt_tokens,
          tokensOut: chunk.usage.completion_tokens,
          durationMs: Date.now() - startTime,
        };
      }
    }
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error("Stream error"));
    return;
  }

  // Fallback to estimation if usage wasn't reported
  if (!usage) {
    const inputText = input.systemPrompt + input.contextBlocks + messages.map(m => m.content).join("");
    usage = {
      tokensIn: estimateTokens(inputText),
      tokensOut: estimateTokens(fullText),
      durationMs: Date.now() - startTime,
    };
  }

  callbacks.onDone(fullText, usage);
}

export async function streamChatAnthropic(
  input: ChatStreamInput,
  config: ProviderConfig,
  callbacks: StreamCallbacks,
): Promise<void> {
  const startTime = Date.now();
  const client = new Anthropic({ apiKey: config.apiKey });
  const messages = buildMessagesWithContext(input);

  const stream = client.messages.stream({
    model: config.model || "claude-sonnet-4-6",
    max_tokens: 4096,
    system: [
      {
        type: "text" as const,
        text: input.systemPrompt,
        cache_control: { type: "ephemeral" },
      } as Anthropic.TextBlockParam,
    ],
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  let fullText = "";
  stream.on("text", (text) => {
    fullText += text;
    callbacks.onToken(text);
  });

  try {
    const finalMessage = await stream.finalMessage();
    const usage: StreamUsageResult = {
      tokensIn: finalMessage.usage.input_tokens,
      tokensOut: finalMessage.usage.output_tokens,
      durationMs: Date.now() - startTime,
    };
    callbacks.onDone(fullText, usage);
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error("Anthropic stream error"));
  }
}

/**
 * Stream chat from Yandex GPT using non-streaming API (Yandex streaming requires gRPC).
 * Delivers the full response as a single token.
 */
export async function streamChatYandex(
  input: ChatStreamInput,
  config: ProviderConfig,
  callbacks: StreamCallbacks,
): Promise<void> {
  const startTime = Date.now();
  const messages = buildMessagesWithContext(input);
  const model = config.model || "yandexgpt/latest";
  const folderId = process.env.YANDEX_FOLDER_ID;
  if (!folderId) throw new Error("YANDEX_FOLDER_ID environment variable is not set");
  const modelUri = model.startsWith("gpt://")
    ? model
    : `gpt://${folderId}/${model}`;

  const apiMessages = [
    { role: "system", text: input.systemPrompt },
    ...messages.map(m => ({ role: m.role, text: m.content })),
  ];

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
        completionOptions: { stream: false, temperature: 0.7, maxTokens: 4096 },
        messages: apiMessages,
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Yandex API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const alt = data?.result?.alternatives?.[0];
  const fullText = alt?.message?.text || "";

  callbacks.onToken(fullText);

  const inputText = input.systemPrompt + messages.map(m => m.content).join("");
  const usage: StreamUsageResult = {
    tokensIn: Number(data?.result?.usage?.inputTextTokens) || estimateTokens(inputText),
    tokensOut: Number(data?.result?.usage?.completionTokens) || estimateTokens(fullText),
    durationMs: Date.now() - startTime,
  };

  callbacks.onDone(fullText, usage);
}

/**
 * Unified streaming dispatcher — picks the right streaming function based on provider ID.
 */
export async function streamChat(
  providerId: ProviderId,
  input: ChatStreamInput,
  config: ProviderConfig,
  callbacks: StreamCallbacks,
): Promise<void> {
  if (providerId === "anthropic") {
    return streamChatAnthropic(input, config, callbacks);
  }

  if (providerId === "yandex") {
    return streamChatYandex(input, config, callbacks);
  }

  // OpenAI-compatible providers: openai, deepseek, grok, gemini
  const baseURL = OPENAI_COMPATIBLE_BASE_URLS[providerId];
  const defaultModel = OPENAI_COMPATIBLE_DEFAULTS[providerId];
  return streamChatOpenAI(input, config, callbacks, baseURL, defaultModel);
}
