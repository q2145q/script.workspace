import { describe, it, expect, afterAll } from "vitest";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { getProvider } from "../../registry";
import { aiRewriteResponseSchema, aiFormatResponseSchema } from "../../types";
import { PROVIDER_CONFIGS, TEST_SCENE, TEST_UNFORMATTED } from "./test-helpers";

interface BenchmarkEntry {
  provider: string;
  model: string;
  task: string;
  durationMs: number;
  blocksCount: number;
  blockTypes: string[];
  schemaValid: boolean;
  responsePreview: string;
  error?: string;
}

const benchmarkResults: BenchmarkEntry[] = [];

describe("Benchmark: Format — all providers", () => {
  for (const provider of PROVIDER_CONFIGS) {
    const testFn = provider.available ? it : it.skip;

    testFn(`Format — ${provider.label}`, async () => {
      const aiProvider = getProvider(provider.id);
      const start = Date.now();

      const result = await aiProvider.format(
        {
          selectedText: TEST_UNFORMATTED,
          contextBefore: "",
          contextAfter: "",
          language: "ru",
        },
        provider.config,
      );

      const duration = Date.now() - start;

      // Validate schema
      let schemaValid = true;
      try {
        aiFormatResponseSchema.parse(result);
      } catch {
        schemaValid = false;
      }

      const types = [...new Set(result.blocks.map(b => b.type))];

      // Must have multiple block types (not all "action")
      expect(schemaValid).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(types.length).toBeGreaterThan(1);

      // Should contain scene heading and dialogue
      expect(types).toContain("sceneHeading");
      expect(types).toContain("dialogue");

      benchmarkResults.push({
        provider: provider.label,
        model: provider.config.model,
        task: "format",
        durationMs: duration,
        blocksCount: result.blocks.length,
        blockTypes: types,
        schemaValid,
        responsePreview: result.blocks.map(b => `[${b.type}] ${b.text.slice(0, 60)}`).join("\n"),
      });
    }, 90_000);
  }
});

describe("Benchmark: Rewrite — all providers", () => {
  for (const provider of PROVIDER_CONFIGS) {
    const testFn = provider.available ? it : it.skip;

    testFn(`Rewrite — ${provider.label}`, async () => {
      const aiProvider = getProvider(provider.id);
      const start = Date.now();

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

      const duration = Date.now() - start;

      let schemaValid = true;
      try {
        aiRewriteResponseSchema.parse(result);
      } catch {
        schemaValid = false;
      }

      const types = [...new Set(result.blocks.map(b => b.type))];

      expect(schemaValid).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);

      benchmarkResults.push({
        provider: provider.label,
        model: provider.config.model,
        task: "rewrite",
        durationMs: duration,
        blocksCount: result.blocks.length,
        blockTypes: types,
        schemaValid,
        responsePreview: result.blocks.map(b => `[${b.type}] ${b.text.slice(0, 60)}`).join("\n"),
      });
    }, 90_000);
  }
});

afterAll(() => {
  if (benchmarkResults.length === 0) return;

  // Build markdown report
  const lines: string[] = [
    "# AI Provider Benchmark Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary Table",
    "",
    "| Provider | Model | Task | Duration (ms) | Blocks | Block Types | Schema Valid |",
    "|----------|-------|------|---------------|--------|-------------|-------------|",
  ];

  for (const r of benchmarkResults) {
    lines.push(
      `| ${r.provider} | ${r.model} | ${r.task} | ${r.durationMs} | ${r.blocksCount} | ${r.blockTypes.join(", ")} | ${r.schemaValid ? "✅" : "❌"} |`,
    );
  }

  lines.push("");
  lines.push("## Detailed Responses");
  lines.push("");

  for (const r of benchmarkResults) {
    lines.push(`### ${r.provider} — ${r.task} (${r.durationMs}ms)`);
    lines.push("");
    lines.push("```");
    lines.push(r.responsePreview);
    lines.push("```");
    if (r.error) {
      lines.push("");
      lines.push(`**Error:** ${r.error}`);
    }
    lines.push("");
  }

  const reportPath = resolve(__dirname, "../../../BENCHMARK.md");
  writeFileSync(reportPath, lines.join("\n"), "utf-8");
  console.log(`\n📊 Benchmark report written to: ${reportPath}\n`);
});
