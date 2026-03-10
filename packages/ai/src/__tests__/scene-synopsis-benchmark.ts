#!/usr/bin/env npx tsx
/**
 * Scene Synopsis Benchmark — Tests scene-synopsis AI function across all models.
 *
 * Tests with 2 scenes of different sizes:
 *   - Short scene: index 3 (family apartment, ~800 chars)
 *   - Long scene: index 0 (pirate battle, ~2500 chars)
 *
 * Run:
 *   cd packages/ai && npx tsx src/__tests__/scene-synopsis-benchmark.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../.env.test"), override: true });

import { completeAI, composePrompt } from "../index.js";
import type { ProviderId } from "../index.js";

// ════════════════════════════════════════════
// Models (17 total)
// ════════════════════════════════════════════

interface ModelDef {
  id: string;
  provider: ProviderId;
}

const ALL_MODELS: ModelDef[] = [
  // OpenAI
  { id: "gpt-5", provider: "openai" },
  { id: "gpt-5-mini", provider: "openai" },
  { id: "gpt-5-nano", provider: "openai" },
  { id: "gpt-4o", provider: "openai" },
  { id: "gpt-4o-mini", provider: "openai" },
  { id: "gpt-4.1", provider: "openai" },
  { id: "gpt-4.1-mini", provider: "openai" },
  { id: "gpt-4.1-nano", provider: "openai" },
  { id: "gpt-4-turbo", provider: "openai" },
  { id: "gpt-4", provider: "openai" },
  // Anthropic
  { id: "claude-opus-4-1-20250805", provider: "anthropic" },
  { id: "claude-opus-4-20250514", provider: "anthropic" },
  { id: "claude-sonnet-4-6", provider: "anthropic" },
  { id: "claude-sonnet-4-5-20250929", provider: "anthropic" },
  { id: "claude-sonnet-4-20250514", provider: "anthropic" },
  { id: "claude-haiku-4-5-20251001", provider: "anthropic" },
  // DeepSeek
  { id: "deepseek-chat", provider: "deepseek" },
];

function getApiKey(provider: ProviderId): string {
  const envMap: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    gemini: "GEMINI_API_KEY",
    yandex: "YANDEX_API_KEY",
    grok: "GROK_API_KEY",
  };
  const key = process.env[envMap[provider]!];
  if (!key) throw new Error(`No API key for ${provider} (env: ${envMap[provider]})`);
  return key;
}

// ════════════════════════════════════════════
// Text Data
// ════════════════════════════════════════════

const AI_DIR = resolve(__dirname, "../../../../AI Instruction");
const MD_OUTPUT_PATH = resolve(AI_DIR, "scene_synopsis_result.md");

const fullText = readFileSync(
  resolve(__dirname, "../../../../AI Instruction/murzilka.txt"),
  "utf-8",
);

// Parse screenplay into scenes
function parseScenes(text: string) {
  const re = /^(\d+)\.\s+(НАТ\.|ИНТ\.|ЭКСТ\.|НАТ\/ИНТ\.).*$/gm;
  const matches = [...text.matchAll(re)];
  matches.sort((a, b) => a.index! - b.index!);

  const scenes: Array<{ heading: string; text: string; index: number }> = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    scenes.push({
      heading: matches[i][0].trim(),
      text: text.slice(start, end).trim(),
      index: i,
    });
  }
  return scenes;
}

const scenes = parseScenes(fullText);
console.log(`Parsed ${scenes.length} scenes from screenplay (${fullText.length} chars)`);

// Test scenes
const shortScene = scenes[3]!; // ИНТ. КВАРТИРА — family apartment (~800 chars)
const longScene = scenes[0]!;  // НАТ. НАВЕТРЕННЫЙ ПРОЛИВ — pirate battle (~2500 chars)

console.log(`Short scene (index 3): "${shortScene.heading}" — ${shortScene.text.length} chars`);
console.log(`Long scene (index 0): "${longScene.heading}" — ${longScene.text.length} chars`);

interface SceneConfig {
  label: string;
  scene: typeof shortScene;
  csvName: string;
}

const SCENE_CONFIGS: SceneConfig[] = [
  { label: "Short scene (family apartment)", scene: shortScene, csvName: "scene_synopsis_text1.csv" },
  { label: "Long scene (pirate battle)", scene: longScene, csvName: "scene_synopsis_text2.csv" },
];

// ════════════════════════════════════════════
// Result Type
// ════════════════════════════════════════════

interface BenchmarkResult {
  model: string;
  provider: string;
  status: "OK" | "ERROR";
  text: string;
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
  error?: string;
}

// ════════════════════════════════════════════
// Runner
// ════════════════════════════════════════════

async function runForModel(
  scene: { heading: string; text: string },
  model: ModelDef,
): Promise<BenchmarkResult> {
  const start = Date.now();

  try {
    const apiKey = getApiKey(model.provider);
    const config = { apiKey, model: model.id };

    const systemPrompt = composePrompt(model.provider, "scene-synopsis", {
      USER_LANGUAGE: "ru",
    });

    const userPrompt = scene.text;

    const result = await completeAI(
      model.provider,
      systemPrompt,
      userPrompt,
      config,
      // No jsonMode — plain text output
    );

    return {
      model: model.id,
      provider: model.provider,
      status: "OK",
      text: result.text,
      tokensIn: result.usage.tokensIn,
      tokensOut: result.usage.tokensOut,
      durationMs: Date.now() - start,
    };
  } catch (error: any) {
    return {
      model: model.id,
      provider: model.provider,
      status: "ERROR",
      text: "",
      tokensIn: 0,
      tokensOut: 0,
      durationMs: Date.now() - start,
      error: error.message || String(error),
    };
  }
}

// ════════════════════════════════════════════
// CSV Output
// ════════════════════════════════════════════

function buildCSV(results: BenchmarkResult[]): string {
  const lines: string[] = [];
  lines.push("Model,Provider,Status,Duration (s),Tokens In,Tokens Out,Synopsis");
  for (const r of results) {
    const duration = (r.durationMs / 1000).toFixed(1);
    const synopsis = r.status === "OK"
      ? `"${r.text.replace(/"/g, '""').replace(/\n/g, " ")}"`
      : `"ERROR: ${(r.error || "").replace(/"/g, '""')}"`;
    lines.push(`${r.model},${r.provider},${r.status},${duration},${r.tokensIn},${r.tokensOut},${synopsis}`);
  }
  return lines.join("\n");
}

// ════════════════════════════════════════════
// Markdown Output
// ════════════════════════════════════════════

function buildMarkdown(
  allResults: Map<string, BenchmarkResult[]>,
): string {
  const lines: string[] = [];
  lines.push("# Scene Synopsis Benchmark Results");
  lines.push("");
  lines.push(`**Date:** ${new Date().toISOString().split("T")[0]}`);
  lines.push(`**Task:** scene-synopsis (plain text, no JSON)`);
  lines.push(`**Models:** ${ALL_MODELS.length}`);
  lines.push(`**Scenes:** ${SCENE_CONFIGS.length}`);
  lines.push("");

  // Show prompt (sample with openai provider)
  try {
    const sampleSystem = composePrompt("openai", "scene-synopsis", { USER_LANGUAGE: "ru" });
    lines.push("## System Prompt");
    lines.push("");
    lines.push("```");
    lines.push(sampleSystem);
    lines.push("```");
    lines.push("");
  } catch {
    lines.push("_(system prompt could not be composed)_");
    lines.push("");
  }

  lines.push("---");
  lines.push("");

  for (const sc of SCENE_CONFIGS) {
    const results = allResults.get(sc.label);
    if (!results) continue;

    lines.push(`## ${sc.label}`);
    lines.push("");
    lines.push(`**Scene heading:** ${sc.scene.heading}`);
    lines.push(`**Scene length:** ${sc.scene.text.length} chars`);
    lines.push("");

    lines.push("### User Prompt (scene text)");
    lines.push("");
    lines.push("```");
    lines.push(
      sc.scene.text.length > 2000
        ? sc.scene.text.slice(0, 2000) + "\n\n...[truncated at 2000 chars]"
        : sc.scene.text,
    );
    lines.push("```");
    lines.push("");

    // Results table
    lines.push("### Results");
    lines.push("");
    lines.push("| Model | Provider | Speed | Tokens In | Tokens Out | Status |");
    lines.push("|-------|----------|-------|-----------|------------|--------|");

    for (const r of results) {
      const speed = r.status === "OK" ? `${(r.durationMs / 1000).toFixed(1)}s` : "—";
      lines.push(
        `| ${r.model} | ${r.provider} | ${speed} | ${r.tokensIn} | ${r.tokensOut} | ${r.status} |`,
      );
    }
    lines.push("");

    // Full responses
    for (const r of results) {
      if (r.status === "OK") {
        lines.push(
          `<details><summary>${r.model} — Synopsis (${r.tokensOut} tokens, ${(r.durationMs / 1000).toFixed(1)}s)</summary>`,
        );
        lines.push("");
        lines.push(r.text);
        lines.push("");
        lines.push("</details>");
        lines.push("");
      } else {
        lines.push(
          `<details><summary>${r.model} — ERROR</summary>`,
        );
        lines.push("");
        lines.push("```");
        lines.push(r.error || "Unknown error");
        lines.push("```");
        lines.push("");
        lines.push("</details>");
        lines.push("");
      }
    }

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

// ════════════════════════════════════════════
// Main
// ════════════════════════════════════════════

async function main() {
  console.log("╔════════════════════════════════════════════════╗");
  console.log("║   Scene Synopsis Benchmark — Мурзилка          ║");
  console.log("╚════════════════════════════════════════════════╝");
  console.log(`Models: ${ALL_MODELS.length} | Scenes: ${SCENE_CONFIGS.length} | Total: ~${ALL_MODELS.length * SCENE_CONFIGS.length} calls`);
  console.log("");

  const allResults = new Map<string, BenchmarkResult[]>();
  let totalCalls = 0;
  let totalErrors = 0;
  const globalStart = Date.now();

  for (const sc of SCENE_CONFIGS) {
    console.log(`\n━━━ ${sc.label}: "${sc.scene.heading}" (${sc.scene.text.length} chars) ━━━`);
    const sceneResults: BenchmarkResult[] = [];

    for (const model of ALL_MODELS) {
      process.stdout.write(`  ${model.id.padEnd(40)} `);
      const result = await runForModel(sc.scene, model);
      sceneResults.push(result);
      totalCalls++;

      if (result.status === "OK") {
        const speed = (result.durationMs / 1000).toFixed(1);
        const preview = result.text.replace(/\n/g, " ").slice(0, 80);
        console.log(
          `OK  ${speed}s  in:${result.tokensIn} out:${result.tokensOut}  "${preview}..."`,
        );
      } else {
        totalErrors++;
        console.log(`ERR ${result.error?.slice(0, 100)}`);
      }
    }

    allResults.set(sc.label, sceneResults);

    // Save CSV for this scene
    const csvPath = resolve(AI_DIR, sc.csvName);
    writeFileSync(csvPath, buildCSV(sceneResults));
    console.log(`  → CSV saved: ${csvPath}`);

    // Save intermediate MD
    writeFileSync(MD_OUTPUT_PATH, buildMarkdown(allResults));
    console.log(`  → MD saved: ${MD_OUTPUT_PATH}`);
  }

  // Final save
  writeFileSync(MD_OUTPUT_PATH, buildMarkdown(allResults));

  const totalTime = ((Date.now() - globalStart) / 1000 / 60).toFixed(1);
  console.log("\n╔════════════════════════════════════════════════╗");
  console.log(`║ Done! ${totalCalls} calls, ${totalErrors} errors, ${totalTime} min          ║`);
  console.log("╚════════════════════════════════════════════════╝");
  console.log(`Results MD: ${MD_OUTPUT_PATH}`);
  console.log(`Results CSV: ${SCENE_CONFIGS.map(s => resolve(AI_DIR, s.csvName)).join(", ")}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
