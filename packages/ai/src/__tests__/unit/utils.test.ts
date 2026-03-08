import { describe, it, expect } from "vitest";
import { isFixedTemperatureModel, stripCodeFences, extractJson, estimateTokens } from "../../utils";

describe("isFixedTemperatureModel", () => {
  it("returns true for GPT-5 family", () => {
    expect(isFixedTemperatureModel("gpt-5")).toBe(true);
    expect(isFixedTemperatureModel("gpt-5-mini")).toBe(true);
    expect(isFixedTemperatureModel("gpt-5-nano")).toBe(true);
  });

  it("returns true for OpenAI o-series reasoning models", () => {
    expect(isFixedTemperatureModel("o1")).toBe(true);
    expect(isFixedTemperatureModel("o3")).toBe(true);
    expect(isFixedTemperatureModel("o4-mini")).toBe(true);
  });

  it("returns true for models with 'reasoner' in name", () => {
    expect(isFixedTemperatureModel("deepseek-reasoner")).toBe(true);
  });

  it("returns false for standard models", () => {
    expect(isFixedTemperatureModel("gpt-4o")).toBe(false);
    expect(isFixedTemperatureModel("claude-sonnet-4-6")).toBe(false);
    expect(isFixedTemperatureModel("claude-haiku-4-5-20251001")).toBe(false);
    expect(isFixedTemperatureModel("deepseek-chat")).toBe(false);
    expect(isFixedTemperatureModel("gemini-2.5-flash")).toBe(false);
    expect(isFixedTemperatureModel("gemini-2.5-pro")).toBe(false);
    expect(isFixedTemperatureModel("grok-3")).toBe(false);
    expect(isFixedTemperatureModel("grok-3-mini")).toBe(false);
    expect(isFixedTemperatureModel("yandexgpt/latest")).toBe(false);
  });
});

describe("stripCodeFences", () => {
  it("strips ```json fences", () => {
    expect(stripCodeFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("strips plain ``` fences", () => {
    expect(stripCodeFences("```\nhello\n```")).toBe("hello");
  });

  it("returns plain text unchanged", () => {
    expect(stripCodeFences('{"a":1}')).toBe('{"a":1}');
  });
});

describe("extractJson", () => {
  it("returns valid JSON unchanged", () => {
    expect(extractJson('{"a":1}')).toBe('{"a":1}');
  });

  it("extracts JSON from text with trailing content", () => {
    const input = '{"issues": []} \n\nHere is my analysis of the scene...';
    expect(JSON.parse(extractJson(input))).toEqual({ issues: [] });
  });

  it("extracts JSON array", () => {
    const input = '[{"id":1}]\n\nAdditional notes here.';
    expect(JSON.parse(extractJson(input))).toEqual([{ id: 1 }]);
  });

  it("handles code-fenced JSON", () => {
    const input = '```json\n{"a":1}\n```';
    expect(JSON.parse(extractJson(input))).toEqual({ a: 1 });
  });

  it("handles markdown-wrapped JSON with trailing text", () => {
    const input = '```json\n{"result": "ok"}\n```\n\nNote: this is a summary';
    expect(JSON.parse(extractJson(input))).toEqual({ result: "ok" });
  });

  it("returns original text if no JSON found", () => {
    expect(extractJson("Just plain text")).toBe("Just plain text");
  });
});

describe("estimateTokens", () => {
  it("estimates English text at ~4 chars per token", () => {
    const tokens = estimateTokens("Hello world, this is a test");
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(20);
  });

  it("estimates Cyrillic text at ~2 chars per token", () => {
    const tokens = estimateTokens("Привет мир, это тест");
    expect(tokens).toBeGreaterThan(5);
  });

  it("detects Cyrillic automatically", () => {
    const en = estimateTokens("abcdefgh");
    const ru = estimateTokens("абвгдежз");
    expect(ru).toBeGreaterThan(en);
  });
});
