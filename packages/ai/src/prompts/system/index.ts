import type { ProviderId } from "../../types";
import { OPENAI_SYSTEM_PROMPT } from "./openai";
import { ANTHROPIC_SYSTEM_PROMPT } from "./anthropic";
import { DEEPSEEK_SYSTEM_PROMPT } from "./deepseek";
import { GEMINI_SYSTEM_PROMPT } from "./gemini";
import { YANDEX_SYSTEM_PROMPT } from "./yandex";
import { GROK_SYSTEM_PROMPT } from "./grok";

export {
  OPENAI_SYSTEM_PROMPT,
  ANTHROPIC_SYSTEM_PROMPT,
  DEEPSEEK_SYSTEM_PROMPT,
  GEMINI_SYSTEM_PROMPT,
  YANDEX_SYSTEM_PROMPT,
  GROK_SYSTEM_PROMPT,
};

const SYSTEM_PROMPTS: Record<ProviderId, string> = {
  openai: OPENAI_SYSTEM_PROMPT,
  anthropic: ANTHROPIC_SYSTEM_PROMPT,
  deepseek: DEEPSEEK_SYSTEM_PROMPT,
  gemini: GEMINI_SYSTEM_PROMPT,
  yandex: YANDEX_SYSTEM_PROMPT,
  grok: GROK_SYSTEM_PROMPT,
};

export function getSystemPrompt(providerId: ProviderId): string {
  return SYSTEM_PROMPTS[providerId];
}
