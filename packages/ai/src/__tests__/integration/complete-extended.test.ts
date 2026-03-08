import { describe, it, expect } from "vitest";
import { z } from "zod";
import { completeAI } from "../../complete";
import { composePrompt } from "../../prompts/compose";
import { extractJson } from "../../utils";
import {
  consistencyResultSchema,
  beatSheetResultSchema,
  pacingResultSchema,
} from "@script/types";
import { aiRewriteResponseSchema } from "../../types";
import { PROVIDER_CONFIGS, TEST_SCENE, TEST_PROJECT_CONTEXT } from "./test-helpers";

describe("Consistency Check: all providers return valid JSON", () => {
  for (const provider of PROVIDER_CONFIGS) {
    const testFn = provider.available ? it : it.skip;

    testFn(`${provider.label} — checkConsistency`, async () => {
      const systemPrompt = composePrompt(provider.id, "consistency-check", {
        USER_LANGUAGE: "ru",
      });

      const result = await completeAI(
        provider.id,
        systemPrompt,
        TEST_SCENE,
        provider.config,
        { jsonMode: true },
      );

      expect(result.text.length).toBeGreaterThan(10);
      const parsed = JSON.parse(extractJson(result.text));
      expect(() => consistencyResultSchema.parse(parsed)).not.toThrow();
      expect(parsed.issues).toBeDefined();
    }, 90_000);
  }
});

describe("Beat Sheet: all providers return valid JSON", () => {
  for (const provider of PROVIDER_CONFIGS) {
    const testFn = provider.available ? it : it.skip;

    testFn(`${provider.label} — generateBeatSheet`, async () => {
      const systemPrompt = composePrompt(provider.id, "beat-sheet", {
        USER_LANGUAGE: "ru",
      });

      const result = await completeAI(
        provider.id,
        systemPrompt,
        TEST_PROJECT_CONTEXT + "\n\n" + TEST_SCENE,
        provider.config,
        { jsonMode: true },
      );

      expect(result.text.length).toBeGreaterThan(10);
      const parsed = JSON.parse(extractJson(result.text));
      expect(() => beatSheetResultSchema.parse(parsed)).not.toThrow();
      expect(parsed.beats.length).toBeGreaterThan(0);
    }, 90_000);
  }
});

describe("Pacing Analysis: all providers return valid JSON", () => {
  for (const provider of PROVIDER_CONFIGS) {
    const testFn = provider.available ? it : it.skip;

    testFn(`${provider.label} — analyzePacing`, async () => {
      const systemPrompt = composePrompt(provider.id, "pacing-analysis", {
        USER_LANGUAGE: "ru",
      });

      const result = await completeAI(
        provider.id,
        systemPrompt,
        TEST_SCENE,
        provider.config,
        // Note: jsonMode omitted — GPT-5 returns inconsistent structure with response_format
        // and some providers occasionally return text instead of JSON (handled by extractJson)
      );

      expect(result.text.length).toBeGreaterThan(10);
      const parsed = JSON.parse(extractJson(result.text));
      expect(() => pacingResultSchema.parse(parsed)).not.toThrow();
      expect(parsed.segments).toBeDefined();
      expect(parsed.overall_assessment).toBeDefined();
    }, 120_000);
  }
});

describe("Scene Synopsis: all providers return text", () => {
  for (const provider of PROVIDER_CONFIGS) {
    const testFn = provider.available ? it : it.skip;

    testFn(`${provider.label} — generateSceneSynopsis`, async () => {
      const systemPrompt = composePrompt(provider.id, "scene-synopsis", {
        USER_LANGUAGE: "ru",
      });

      const result = await completeAI(
        provider.id,
        systemPrompt,
        `Scene heading: INT. КАБИНЕТ СЛЕДОВАТЕЛЯ — НОЧЬ\n\nScene text:\n${TEST_SCENE}`,
        provider.config,
      );

      expect(result.text.trim().length).toBeGreaterThan(20);
      // Synopsis should be plain text, not JSON
      expect(result.usage.tokensIn).toBeGreaterThan(0);
      expect(result.usage.tokensOut).toBeGreaterThan(0);
    }, 60_000);
  }
});

describe("Act Assignment: all providers return valid scene-act mapping", () => {
  const SCENE_LIST = [
    "Scene 0: INT. КАБИНЕТ СЛЕДОВАТЕЛЯ — НОЧЬ — Иван изучает фотографии",
    "Scene 1: EXT. ПАРК — ДЕНЬ — Мария допрашивает свидетеля",
    "Scene 2: INT. КВАРТИРА ПОДОЗРЕВАЕМОГО — ВЕЧЕР — Обыск квартиры",
    "Scene 3: INT. УЧАСТОК — НОЧЬ — Допрос подозреваемого",
    "Scene 4: EXT. МОСТ — РАССВЕТ — Финальная конфронтация",
  ].join("\n");

  const actAssignmentSchema = z.array(z.object({
    sceneIndex: z.number(),
    act: z.number().int().min(1).max(3),
  }));

  for (const provider of PROVIDER_CONFIGS) {
    const testFn = provider.available ? it : it.skip;

    testFn(`${provider.label} — assignActs`, async () => {
      const systemPrompt = composePrompt(provider.id, "act-assignment", {
        SCENE_LIST,
      });

      const result = await completeAI(
        provider.id,
        systemPrompt,
        `Assign these 5 scenes to acts 1, 2, or 3.`,
        provider.config,
      );

      expect(result.text.length).toBeGreaterThan(5);
      const parsed = actAssignmentSchema.parse(
        JSON.parse(extractJson(result.text)),
      );
      expect(parsed.length).toBe(5);
      for (const item of parsed) {
        expect(item.act).toBeGreaterThanOrEqual(1);
        expect(item.act).toBeLessThanOrEqual(3);
      }
    }, 90_000);
  }
});

describe("Dialogue Pass: all providers return valid rewrite blocks", () => {
  const DIALOGUE_BLOCKS = `[dialogue] Что-то здесь не складывается...\n[dialogue] Есть новости. Свидетель изменил показания.\n[dialogue] Какой именно?`;

  for (const provider of PROVIDER_CONFIGS) {
    const testFn = provider.available ? it : it.skip;

    testFn(`${provider.label} — dialoguePass`, async () => {
      const systemPrompt = composePrompt(provider.id, "dialogue-pass", {
        USER_LANGUAGE: "ru",
      });

      const result = await completeAI(
        provider.id,
        systemPrompt,
        `Selected dialogue blocks:\n${DIALOGUE_BLOCKS}\n\nContext before:\nINT. КАБИНЕТ СЛЕДОВАТЕЛЯ — НОЧЬ\n\nИВАН (40) сидит за столом, перебирая фотографии с места преступления.`,
        provider.config,
        { jsonMode: true },
      );

      expect(result.text.length).toBeGreaterThan(10);
      const parsed = JSON.parse(extractJson(result.text));
      expect(() => aiRewriteResponseSchema.parse(parsed)).not.toThrow();
      expect(parsed.blocks.length).toBeGreaterThan(0);
    }, 90_000);
  }
});
