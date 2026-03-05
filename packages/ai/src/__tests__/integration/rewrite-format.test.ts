import { describe, it, expect } from "vitest";
import { getProvider } from "../../registry";
import { aiRewriteResponseSchema, aiFormatResponseSchema } from "../../types";
import { PROVIDER_CONFIGS, TEST_SCENE, TEST_UNFORMATTED } from "./test-helpers";

describe("Rewrite: all providers return valid blocks", () => {
  for (const provider of PROVIDER_CONFIGS) {
    const testFn = provider.available ? it : it.skip;

    testFn(`${provider.label} — rewrite returns valid schema`, async () => {
      const aiProvider = getProvider(provider.id);
      const result = await aiProvider.rewrite(
        {
          selectedText: "Что-то здесь не складывается...",
          instruction: "Сделай реплику более эмоциональной и драматичной",
          contextBefore: "ИВАН (40) сидит за столом, перебирая фотографии с места преступления.\n\nИВАН\n(себе под нос)",
          contextAfter: "Дверь открывается. Входит МАРИЯ (35), его напарница.",
          nodeType: "dialogue",
          language: "ru",
        },
        provider.config,
      );

      // Validate against schema
      expect(() => aiRewriteResponseSchema.parse(result)).not.toThrow();
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.blocks[0].text.length).toBeGreaterThan(0);
    }, 60_000);
  }
});

describe("Format: all providers return valid screenplay blocks", () => {
  for (const provider of PROVIDER_CONFIGS) {
    const testFn = provider.available ? it : it.skip;

    testFn(`${provider.label} — format returns valid blocks`, async () => {
      const aiProvider = getProvider(provider.id);
      const result = await aiProvider.format(
        {
          selectedText: TEST_UNFORMATTED,
          contextBefore: "",
          contextAfter: "",
          language: "ru",
        },
        provider.config,
      );

      // Validate against schema
      expect(() => aiFormatResponseSchema.parse(result)).not.toThrow();
      expect(result.blocks.length).toBeGreaterThan(0);

      // Should contain scene heading
      const hasSceneHeading = result.blocks.some(b => b.type === "sceneHeading");
      expect(hasSceneHeading).toBe(true);

      // Should contain dialogue
      const hasDialogue = result.blocks.some(b => b.type === "dialogue");
      expect(hasDialogue).toBe(true);
    }, 60_000);
  }
});
