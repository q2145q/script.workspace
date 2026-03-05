import type { AIProvider, ProviderId } from "./types";
import { OpenAIProvider } from "./providers/openai";
import { AnthropicProvider } from "./providers/anthropic";
import { DeepSeekProvider } from "./providers/deepseek";
import { GeminiProvider } from "./providers/gemini";
import { YandexProvider } from "./providers/yandex";
import { GrokProvider } from "./providers/grok";

const providers = new Map<ProviderId, AIProvider>();

// Register built-in providers
providers.set("openai", new OpenAIProvider());
providers.set("anthropic", new AnthropicProvider());
providers.set("deepseek", DeepSeekProvider);
providers.set("gemini", new GeminiProvider());
providers.set("yandex", new YandexProvider());
providers.set("grok", GrokProvider);

export function getProvider(id: ProviderId): AIProvider {
  const provider = providers.get(id);
  if (!provider) {
    throw new Error(`Unknown AI provider: ${id}`);
  }
  return provider;
}

export function registerProvider(provider: AIProvider): void {
  providers.set(provider.id, provider);
}
