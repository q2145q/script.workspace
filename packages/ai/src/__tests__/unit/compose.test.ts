import { describe, it, expect } from "vitest";
import { composePrompt, fillTemplate } from "../../prompts/compose";

describe("composePrompt", () => {
  it("composes a prompt for openai + chat", () => {
    const result = composePrompt("openai", "chat", {
      PROJECT_CONTEXT: "Test project context",
      USER_LANGUAGE: "ru",
    });

    // Should contain the system prompt content
    expect(result).toContain("AI Screenwriting Assistant");
    // Should have task instructions injected
    expect(result).toContain("Screenplay Environment Chat Assistant");
    // PROJECT_CONTEXT should be filled
    expect(result).toContain("Test project context");
    // USER_LANGUAGE should be filled
    expect(result).toContain("ru");
    // Template variables should be replaced
    expect(result).not.toContain("{{TASK_INSTRUCTIONS}}");
    expect(result).not.toContain("{{USER_LANGUAGE}}");
  });

  it("composes a prompt for anthropic + chat", () => {
    const result = composePrompt("anthropic", "chat", {
      PROJECT_CONTEXT: "Claude project context",
      USER_LANGUAGE: "en",
    });

    // Anthropic prompt uses XML tags
    expect(result).toContain("<project_context>");
    expect(result).toContain("Claude project context");
    expect(result).toContain("<task_instructions>");
    expect(result).toContain("Screenplay Environment Chat Assistant");
  });

  it("composes a prompt for deepseek + rewrite", () => {
    const result = composePrompt("deepseek", "rewrite", {
      PROJECT_CONTEXT: "Deepseek project",
      USER_LANGUAGE: "en",
    });

    expect(result).toContain("DeepSeek");
    expect(result).toContain("Rewrite Task");
    expect(result).toContain("blocks");
  });

  it("composes a prompt for gemini + analysis", () => {
    const result = composePrompt("gemini", "analysis", {
      PROJECT_CONTEXT: "",
      USER_LANGUAGE: "en",
    });

    expect(result).toContain("Gemini");
    expect(result).toContain("scene_function");
  });

  it("composes a prompt for yandex + format", () => {
    const result = composePrompt("yandex", "format", {
      PROJECT_CONTEXT: "",
      USER_LANGUAGE: "ru",
    });

    expect(result).toContain("YandexGPT");
    expect(result).toContain("Screenplay Formatting Assistant");
  });

  it("grok uses openai system prompt", () => {
    const result = composePrompt("grok", "chat", {
      PROJECT_CONTEXT: "",
      USER_LANGUAGE: "en",
    });

    // Grok should use the OpenAI system prompt (no provider-specific header)
    expect(result).toContain("AI Screenwriting Assistant");
    expect(result).not.toContain("DeepSeek");
    expect(result).not.toContain("Gemini");
    expect(result).not.toContain("YandexGPT");
  });

  it("passes through extra variables to task prompt", () => {
    const result = composePrompt("openai", "analysis", {
      PROJECT_CONTEXT: "",
      USER_LANGUAGE: "en",
      SCENE_TEXT: "INT. OFFICE - NIGHT\nJohn sits alone.",
    });

    // SCENE_TEXT is inside the task prompt which gets injected into the system prompt.
    // composePrompt does a single-pass fillTemplate, so {{SCENE_TEXT}} from the task
    // prompt is also replaced since all variables are passed together.
    expect(result).toContain("INT. OFFICE - NIGHT");
    expect(result).not.toContain("{{SCENE_TEXT}}");
  });
});

describe("fillTemplate with composePrompt variables", () => {
  it("handles nested variable replacement", () => {
    const template = "System: {{TASK_INSTRUCTIONS}} | Lang: {{USER_LANGUAGE}}";
    const taskContent = "Task with {{SCENE_TEXT}}";

    // First pass: inject task
    const withTask = fillTemplate(template, {
      TASK_INSTRUCTIONS: taskContent,
      USER_LANGUAGE: "ru",
    });

    expect(withTask).toBe("System: Task with {{SCENE_TEXT}} | Lang: ru");

    // Second pass: fill remaining variables
    const final = fillTemplate(withTask, { SCENE_TEXT: "test scene" });
    expect(final).toBe("System: Task with test scene | Lang: ru");
  });
});
