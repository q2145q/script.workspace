import { describe, it, expect } from "vitest";
import { getSystemPrompt } from "../../prompts/system/index";
import {
  OPENAI_SYSTEM_PROMPT,
  ANTHROPIC_SYSTEM_PROMPT,
  DEEPSEEK_SYSTEM_PROMPT,
  GEMINI_SYSTEM_PROMPT,
  YANDEX_SYSTEM_PROMPT,
} from "../../prompts/system/index";
import type { ProviderId } from "../../types";

describe("getSystemPrompt", () => {
  const providers: ProviderId[] = ["openai", "anthropic", "deepseek", "gemini", "yandex", "grok"];

  it.each(providers)("returns a non-empty string for %s", (providerId) => {
    const prompt = getSystemPrompt(providerId);
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
  });

  it("all prompts contain {{TASK_INSTRUCTIONS}} placeholder", () => {
    for (const id of providers) {
      const prompt = getSystemPrompt(id);
      expect(prompt).toContain("{{TASK_INSTRUCTIONS}}");
    }
  });

  it("all prompts contain {{USER_LANGUAGE}} placeholder", () => {
    for (const id of providers) {
      const prompt = getSystemPrompt(id);
      expect(prompt).toContain("{{USER_LANGUAGE}}");
    }
  });

  it("all prompts contain {{PROJECT_CONTEXT}} placeholder", () => {
    for (const id of providers) {
      const prompt = getSystemPrompt(id);
      expect(prompt).toContain("{{PROJECT_CONTEXT}}");
    }
  });

  it("all prompts mention screenwriting", () => {
    for (const id of providers) {
      const prompt = getSystemPrompt(id).toLowerCase();
      expect(prompt).toContain("screenplay");
    }
  });
});

describe("provider-specific prompts", () => {
  it("anthropic prompt uses XML tags", () => {
    expect(ANTHROPIC_SYSTEM_PROMPT).toContain("<project_context>");
    expect(ANTHROPIC_SYSTEM_PROMPT).toContain("</project_context>");
    expect(ANTHROPIC_SYSTEM_PROMPT).toContain("<task_instructions>");
    expect(ANTHROPIC_SYSTEM_PROMPT).toContain("</task_instructions>");
    expect(ANTHROPIC_SYSTEM_PROMPT).toContain("<user_language>");
  });

  it("openai prompt does not use XML tags for context", () => {
    expect(OPENAI_SYSTEM_PROMPT).not.toContain("<project_context>");
    expect(OPENAI_SYSTEM_PROMPT).not.toContain("<task_instructions>");
  });

  it("deepseek prompt references DeepSeek", () => {
    expect(DEEPSEEK_SYSTEM_PROMPT).toContain("DeepSeek");
  });

  it("gemini prompt references Gemini", () => {
    expect(GEMINI_SYSTEM_PROMPT).toContain("Gemini");
  });

  it("yandex prompt references YandexGPT", () => {
    expect(YANDEX_SYSTEM_PROMPT).toContain("YandexGPT");
  });

  it("grok uses openai prompt", () => {
    expect(getSystemPrompt("grok")).toBe(OPENAI_SYSTEM_PROMPT);
  });
});
