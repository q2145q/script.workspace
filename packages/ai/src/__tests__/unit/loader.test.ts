import { describe, it, expect, beforeEach } from "vitest";
import { loadTaskPrompt, clearPromptCache } from "../../prompts/loader";

describe("loadTaskPrompt", () => {
  beforeEach(() => {
    clearPromptCache();
  });

  it("loads chat.md task prompt", () => {
    const content = loadTaskPrompt("chat");
    expect(content).toContain("Screenplay Environment Chat Assistant");
    expect(content).toContain("{{SCREENPLAY_STRUCTURE}}");
  });

  it("loads rewrite.md task prompt", () => {
    const content = loadTaskPrompt("rewrite");
    expect(content).toContain("Rewrite Task");
    expect(content).toContain("blocks");
    expect(content).toContain("nodeType");
  });

  it("loads format.md task prompt", () => {
    const content = loadTaskPrompt("format");
    expect(content).toContain("Screenplay Formatting Assistant");
    expect(content).toContain("sceneHeading");
  });

  it("loads analysis.md task prompt", () => {
    const content = loadTaskPrompt("analysis");
    expect(content).toContain("scene_function");
    expect(content).toContain("{{SCENE_TEXT}}");
  });

  it("loads character-analysis.md task prompt", () => {
    const content = loadTaskPrompt("character-analysis");
    expect(content).toContain("characters");
    expect(content).toContain("role_in_story");
  });

  it("loads structure-analysis.md task prompt", () => {
    const content = loadTaskPrompt("structure-analysis");
    expect(content).toContain("three-act structure");
    expect(content).toContain("turning_points");
  });

  it("loads logline.md task prompt", () => {
    const content = loadTaskPrompt("logline");
    expect(content).toContain("logline");
    expect(content).toContain("{{USER_LANGUAGE}}");
  });

  it("loads synopsis.md task prompt", () => {
    const content = loadTaskPrompt("synopsis");
    expect(content).toContain("synopsis");
    expect(content).toContain("{{USER_LANGUAGE}}");
  });

  it("loads describe-character.md task prompt", () => {
    const content = loadTaskPrompt("describe-character");
    expect(content).toContain("Character Description");
    expect(content).toContain("5–7 sentences");
  });

  it("loads describe-location.md task prompt", () => {
    const content = loadTaskPrompt("describe-location");
    expect(content).toContain("Location Description");
    expect(content).toContain("3–7 sentences");
  });

  it("loads knowledge-graph.md task prompt", () => {
    const content = loadTaskPrompt("knowledge-graph");
    expect(content).toContain("Knowledge Graph");
    expect(content).toContain("entities");
    expect(content).toContain("relationships");
  });

  it("caches loaded prompts", () => {
    const first = loadTaskPrompt("chat");
    const second = loadTaskPrompt("chat");
    expect(first).toBe(second); // same reference (from cache)
  });

  it("throws on non-existent task", () => {
    expect(() => loadTaskPrompt("nonexistent-task")).toThrow();
  });
});
