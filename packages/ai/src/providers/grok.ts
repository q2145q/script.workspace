import { OpenAICompatibleProvider } from "./openai-compatible";

export const GrokProvider = new OpenAICompatibleProvider(
  "grok",
  "https://api.x.ai/v1",
  "grok-3",
  true, // supports json_schema structured outputs
);
