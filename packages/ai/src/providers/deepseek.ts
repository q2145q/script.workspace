import { OpenAICompatibleProvider } from "./openai-compatible";

export const DeepSeekProvider = new OpenAICompatibleProvider(
  "deepseek",
  "https://api.deepseek.com",
  "deepseek-chat",
);
