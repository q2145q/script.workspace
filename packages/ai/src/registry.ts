import type { AIProvider, ProviderId } from "./types";
import { OpenAIProvider } from "./providers/openai";
import { AnthropicProvider } from "./providers/anthropic";

const providers = new Map<ProviderId, AIProvider>();

// Register built-in providers
providers.set("openai", new OpenAIProvider());
providers.set("anthropic", new AnthropicProvider());

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
