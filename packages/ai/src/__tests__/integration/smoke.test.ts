import { describe, it, expect } from "vitest";
import { streamChat } from "../../chat-stream";
import type { StreamCallbacks } from "../../chat-stream";
import { composePrompt } from "../../prompts/compose";
import { PROVIDER_CONFIGS, TEST_PROJECT_CONTEXT } from "./test-helpers";

describe("Smoke: all providers respond to chat", () => {
  for (const provider of PROVIDER_CONFIGS) {
    const testFn = provider.available ? it : it.skip;

    testFn(`${provider.label} — responds to a simple message`, async () => {
      const systemPrompt = composePrompt(provider.id, "chat", {
        PROJECT_CONTEXT: TEST_PROJECT_CONTEXT,
        USER_LANGUAGE: "ru",
        SCREENPLAY_STRUCTURE: "",
      });

      let fullText = "";
      let tokenCount = 0;

      const callbacks: StreamCallbacks = {
        onToken: (token) => {
          fullText += token;
          tokenCount++;
        },
        onDone: (text, usage) => {
          fullText = text;
          expect(text.length).toBeGreaterThan(0);
          if (usage) {
            expect(usage.tokensIn).toBeGreaterThan(0);
            expect(usage.tokensOut).toBeGreaterThan(0);
          }
        },
        onError: (error) => {
          throw error;
        },
      };

      await streamChat(
        provider.id,
        {
          messages: [{ role: "user", content: "Привет! Расскажи кратко, кто такой Иван в этом проекте?" }],
          systemPrompt,
          contextBlocks: "",
        },
        provider.config,
        callbacks,
      );

      expect(fullText.length).toBeGreaterThan(10);
    }, 60_000);
  }
});
