import { describe, it, expect } from "vitest";
import { completeAI } from "../../complete";
import { composePrompt } from "../../prompts/compose";
import {
  sceneAnalysisSchema,
  characterAnalysisSchema,
  structureAnalysisSchema,
  knowledgeGraphSchema,
} from "@script/types";
import { PROVIDER_CONFIGS, TEST_SCENE, TEST_PROJECT_CONTEXT } from "./test-helpers";

function stripCodeFences(text: string): string {
  let raw = text.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return raw;
}

describe("Scene Analysis: all providers return valid JSON", () => {
  for (const provider of PROVIDER_CONFIGS) {
    const testFn = provider.available ? it : it.skip;

    testFn(`${provider.label} — analyzeScene`, async () => {
      const systemPrompt = composePrompt(provider.id, "analysis", {
        SCENE_TEXT: TEST_SCENE,
        USER_LANGUAGE: "ru",
      });

      const result = await completeAI(
        provider.id,
        systemPrompt,
        TEST_SCENE,
        provider.config,
      );

      expect(result.text.length).toBeGreaterThan(10);
      const parsed = JSON.parse(stripCodeFences(result.text));
      expect(() => sceneAnalysisSchema.parse(parsed)).not.toThrow();
      expect(parsed.characters_present.length).toBeGreaterThan(0);
    }, 90_000);
  }
});

describe("Character Analysis: all providers return valid JSON", () => {
  for (const provider of PROVIDER_CONFIGS) {
    const testFn = provider.available ? it : it.skip;

    testFn(`${provider.label} — analyzeCharacters`, async () => {
      const systemPrompt = composePrompt(provider.id, "character-analysis", {
        SCENE_TEXT: TEST_SCENE,
        USER_LANGUAGE: "ru",
      });

      const result = await completeAI(
        provider.id,
        systemPrompt,
        TEST_SCENE,
        provider.config,
      );

      expect(result.text.length).toBeGreaterThan(10);
      const parsed = JSON.parse(stripCodeFences(result.text));
      expect(() => characterAnalysisSchema.parse(parsed)).not.toThrow();
      expect(parsed.characters.length).toBeGreaterThan(0);
    }, 90_000);
  }
});

describe("Structure Analysis: all providers return valid JSON", () => {
  for (const provider of PROVIDER_CONFIGS) {
    const testFn = provider.available ? it : it.skip;

    testFn(`${provider.label} — analyzeStructure`, async () => {
      const systemPrompt = composePrompt(provider.id, "structure-analysis", {
        SCENE_TEXT: TEST_SCENE,
        USER_LANGUAGE: "ru",
      });

      const result = await completeAI(
        provider.id,
        systemPrompt,
        TEST_SCENE,
        provider.config,
      );

      expect(result.text.length).toBeGreaterThan(10);
      const parsed = JSON.parse(stripCodeFences(result.text));
      expect(() => structureAnalysisSchema.parse(parsed)).not.toThrow();
    }, 90_000);
  }
});

describe("Logline: all providers return text", () => {
  for (const provider of PROVIDER_CONFIGS) {
    const testFn = provider.available ? it : it.skip;

    testFn(`${provider.label} — generateLogline`, async () => {
      const systemPrompt = composePrompt(provider.id, "logline", {
        PROJECT_CONTEXT: TEST_PROJECT_CONTEXT + "\n\n" + TEST_SCENE,
        USER_REQUEST: "Напиши логлайн для этого проекта",
        USER_LANGUAGE: "ru",
      });

      const result = await completeAI(
        provider.id,
        systemPrompt,
        "Напиши логлайн для этого проекта.",
        provider.config,
      );

      expect(result.text.trim().length).toBeGreaterThan(20);
      // Logline should be 1-2 sentences, not JSON
      expect(result.text).not.toContain("{");
    }, 60_000);
  }
});

describe("Synopsis: all providers return text", () => {
  for (const provider of PROVIDER_CONFIGS) {
    const testFn = provider.available ? it : it.skip;

    testFn(`${provider.label} — generateSynopsis`, async () => {
      const systemPrompt = composePrompt(provider.id, "synopsis", {
        USER_LANGUAGE: "ru",
      });

      const result = await completeAI(
        provider.id,
        systemPrompt,
        TEST_PROJECT_CONTEXT + "\n\n" + TEST_SCENE,
        provider.config,
      );

      expect(result.text.trim().length).toBeGreaterThan(100);
    }, 90_000);
  }
});

describe("Describe Character: all providers return text", () => {
  for (const provider of PROVIDER_CONFIGS) {
    const testFn = provider.available ? it : it.skip;

    testFn(`${provider.label} — describeCharacter`, async () => {
      const systemPrompt = composePrompt(provider.id, "describe-character", {
        USER_LANGUAGE: "ru",
      });

      const result = await completeAI(
        provider.id,
        systemPrompt,
        `Character: Иван\n\nContext:\n${TEST_SCENE}`,
        provider.config,
      );

      expect(result.text.trim().length).toBeGreaterThan(30);
    }, 60_000);
  }
});

describe("Describe Location: all providers return text", () => {
  for (const provider of PROVIDER_CONFIGS) {
    const testFn = provider.available ? it : it.skip;

    testFn(`${provider.label} — describeLocation`, async () => {
      const systemPrompt = composePrompt(provider.id, "describe-location", {
        USER_LANGUAGE: "ru",
      });

      const result = await completeAI(
        provider.id,
        systemPrompt,
        `Location: Кабинет следователя\n\nContext:\n${TEST_SCENE}`,
        provider.config,
      );

      expect(result.text.trim().length).toBeGreaterThan(30);
    }, 60_000);
  }
});

describe("Knowledge Graph: all providers return valid JSON", () => {
  for (const provider of PROVIDER_CONFIGS) {
    const testFn = provider.available ? it : it.skip;

    testFn(`${provider.label} — extractKnowledgeGraph`, async () => {
      const systemPrompt = composePrompt(provider.id, "knowledge-graph", {
        USER_LANGUAGE: "ru",
      });

      const result = await completeAI(
        provider.id,
        systemPrompt,
        TEST_SCENE,
        provider.config,
      );

      expect(result.text.length).toBeGreaterThan(10);
      const parsed = JSON.parse(stripCodeFences(result.text));
      expect(() => knowledgeGraphSchema.parse(parsed)).not.toThrow();
      expect(parsed.entities.length).toBeGreaterThan(0);
    }, 90_000);
  }
});
