import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { ProviderConfig } from "./types";

export interface ChatStreamInput {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  systemPrompt: string;
  contextBlocks: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
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

export async function streamChatOpenAI(
  input: ChatStreamInput,
  config: ProviderConfig,
  callbacks: StreamCallbacks,
): Promise<void> {
  const client = new OpenAI({ apiKey: config.apiKey });
  const messages = buildMessagesWithContext(input);

  const stream = await client.chat.completions.create({
    model: config.model || "gpt-4.1",
    messages: [
      { role: "system" as const, content: input.systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 4096,
  });

  let fullText = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      fullText += delta;
      callbacks.onToken(delta);
    }
  }
  callbacks.onDone(fullText);
}

export async function streamChatAnthropic(
  input: ChatStreamInput,
  config: ProviderConfig,
  callbacks: StreamCallbacks,
): Promise<void> {
  const client = new Anthropic({ apiKey: config.apiKey });
  const messages = buildMessagesWithContext(input);

  const stream = client.messages.stream({
    model: config.model || "claude-sonnet-4-6",
    max_tokens: 4096,
    system: input.systemPrompt,
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

  await stream.finalMessage();
  callbacks.onDone(fullText);
}
