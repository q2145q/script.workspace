#!/usr/bin/env npx tsx
/**
 * Analysis Benchmark — Tests scene analysis across all models × 2 scene sizes.
 * Short: scene 4 (family apartment, ~800 chars)
 * Long: scene 1 (pirate battle + spaceship, ~2500 chars)
 *
 * Run:
 *   cd packages/ai && npx tsx src/__tests__/analysis-benchmark.ts
 */

import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync, writeFileSync } from "fs";
import { completeAI, composePrompt } from "../index.js";
import type { ProviderId } from "../index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../.env.test"), override: true });

const AI_DIR = resolve(__dirname, "../../../../AI Instruction");
const OUTPUT_MD = resolve(AI_DIR, "analysis_result.md");
const MURZILKA_PATH = resolve(AI_DIR, "murzilka.txt");

// ════════════════════════════════════════════
// Models (no gpt-5-pro, gpt-5-codex, claude-3-haiku)
// ════════════════════════════════════════════

interface ModelDef {
  id: string;
  provider: ProviderId;
}

const ALL_MODELS: ModelDef[] = [
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
  { id: "claude-opus-4-1-20250805", provider: "anthropic" },
  { id: "claude-opus-4-20250514", provider: "anthropic" },
  { id: "claude-sonnet-4-6", provider: "anthropic" },
  { id: "claude-sonnet-4-5-20250929", provider: "anthropic" },
  { id: "claude-sonnet-4-20250514", provider: "anthropic" },
  { id: "claude-haiku-4-5-20251001", provider: "anthropic" },
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
  if (!key) throw new Error(`No API key for ${provider}`);
  return key;
}

// ════════════════════════════════════════════
// Text Preparation
// ════════════════════════════════════════════

const fullText = readFileSync(MURZILKA_PATH, "utf-8");

function splitByScenes(text: string) {
  const re = /^(\d+)\.\s+(НАТ\.|ИНТ\.|ЭКСТ\.|НАТ\/ИНТ\.).*$/gm;
  const matches = [...text.matchAll(re)].sort((a, b) => a.index! - b.index!);
  const scenes: Array<{ heading: string; body: string }> = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    scenes.push({ heading: matches[i][0].trim(), body: text.slice(start, end).trim() });
  }
  return scenes;
}

const scenes = splitByScenes(fullText);
console.log(`Parsed ${scenes.length} scenes`);

// Short scene: scene 4 — family apartment (~800 chars)
const shortScene = scenes[3]!;
// Long scene: scene 1 — pirate battle + spaceship (~2500 chars)
const longScene = scenes[0]!;

interface SceneConfig {
  label: string;
  description: string;
  sceneText: string;
}

const SCENE_CONFIGS: SceneConfig[] = [
  {
    label: "Сцена 1 — Короткая (семейная, ~800 символов)",
    description: `${shortScene.heading} — ${shortScene.body.length} символов`,
    sceneText: shortScene.body,
  },
  {
    label: "Сцена 2 — Длинная (пиратская битва, ~2500 символов)",
    description: `${longScene.heading} — ${longScene.body.length} символов`,
    sceneText: longScene.body,
  },
];

console.log(`Short scene: ${shortScene.body.length} chars — ${shortScene.heading}`);
console.log(`Long scene: ${longScene.body.length} chars — ${longScene.heading}`);

// ════════════════════════════════════════════
// Result type
// ════════════════════════════════════════════

interface BenchResult {
  model: string;
  provider: string;
  status: "OK" | "ERROR";
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
  responseText: string;
  error?: string;
}

// ════════════════════════════════════════════
// Runner — uses completeAI directly
// ════════════════════════════════════════════

async function runAnalysis(modelDef: ModelDef, sceneText: string): Promise<BenchResult> {
  const start = Date.now();
  try {
    const apiKey = getApiKey(modelDef.provider);
    const systemPrompt = composePrompt(modelDef.provider, "analysis", {
      SCENE_TEXT: sceneText,
      USER_LANGUAGE: "ru",
    });

    const result = await completeAI(
      modelDef.provider,
      systemPrompt,
      sceneText,
      { apiKey, model: modelDef.id },
      { jsonMode: true },
    );

    return {
      model: modelDef.id,
      provider: modelDef.provider,
      status: "OK",
      tokensIn: result.usage.tokensIn,
      tokensOut: result.usage.tokensOut,
      durationMs: Date.now() - start,
      responseText: result.text,
    };
  } catch (err: any) {
    return {
      model: modelDef.id,
      provider: modelDef.provider,
      status: "ERROR",
      tokensIn: 0,
      tokensOut: 0,
      durationMs: Date.now() - start,
      responseText: "",
      error: err.message || String(err),
    };
  }
}

// ════════════════════════════════════════════
// CSV + Markdown generators
// ════════════════════════════════════════════

function escapeCsv(value: string): string {
  if (value.includes(";") || value.includes("\n") || value.includes('"') || value.includes(",")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function saveCsv(results: BenchResult[], filePath: string) {
  const headers = ["Модель", "Token In", "Token Out", "Время", "Статус", "Полный ответ модели"];
  const rows = [headers.join(";")];
  for (const r of results) {
    rows.push([
      r.model,
      String(r.tokensIn),
      String(r.tokensOut),
      r.status === "OK" ? `${(r.durationMs / 1000).toFixed(1)}s` : "—",
      r.status,
      escapeCsv(r.responseText || r.error || ""),
    ].join(";"));
  }
  writeFileSync(filePath, "\uFEFF" + rows.join("\n"), "utf-8");
}

function buildMarkdown(allResults: Map<string, BenchResult[]>, csvNames: string[]): string {
  const lines: string[] = [];
  lines.push("# Analysis Benchmark Results — Мурзилка");
  lines.push("");
  lines.push(`**Дата:** ${new Date().toISOString().split("T")[0]}`);
  lines.push(`**Моделей:** ${ALL_MODELS.length}`);
  lines.push(`**Сцен:** ${SCENE_CONFIGS.length}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  let csvIdx = 0;
  for (const cfg of SCENE_CONFIGS) {
    const results = allResults.get(cfg.label);
    if (!results) continue;

    const csvName = csvNames[csvIdx++];
    lines.push(`## ${cfg.label}`);
    lines.push("");
    lines.push(`> ${cfg.description}`);
    lines.push("");

    // Show scene text
    lines.push("### Текст сцены");
    lines.push("");
    lines.push("```");
    lines.push(cfg.sceneText.length > 3000 ? cfg.sceneText.slice(0, 3000) + "\n\n...[обрезано]" : cfg.sceneText);
    lines.push("```");
    lines.push("");

    // CSV link
    lines.push("### Результаты");
    lines.push("");
    lines.push(`**CSV:** [${csvName}](./${csvName})`);
    lines.push("");

    // Summary table
    lines.push("| Модель | Token In | Token Out | Время | Статус |");
    lines.push("|--------|----------|-----------|-------|--------|");
    for (const r of results) {
      const time = r.status === "OK" ? `${(r.durationMs / 1000).toFixed(1)}s` : "—";
      lines.push(`| ${r.model} | ${r.tokensIn} | ${r.tokensOut} | ${time} | ${r.status} |`);
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

// ════════════════════════════════════════════
// Main
// ════════════════════════════════════════════

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   Analysis Benchmark — Мурзилка × All Models    ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`Models: ${ALL_MODELS.length} | Scenes: ${SCENE_CONFIGS.length} | Total: ${ALL_MODELS.length * SCENE_CONFIGS.length} calls`);
  console.log("");

  const allResults = new Map<string, BenchResult[]>();
  const csvNames: string[] = [];
  let totalCalls = 0;
  let totalErrors = 0;
  const globalStart = Date.now();

  for (let si = 0; si < SCENE_CONFIGS.length; si++) {
    const cfg = SCENE_CONFIGS[si];
    const csvName = `analysis_scene${si + 1}.csv`;
    csvNames.push(csvName);

    console.log(`\n━━━ ${cfg.label} ━━━`);
    const results: BenchResult[] = [];

    for (const model of ALL_MODELS) {
      process.stdout.write(`  ${model.id.padEnd(40)} `);
      const result = await runAnalysis(model, cfg.sceneText);
      results.push(result);
      totalCalls++;

      if (result.status === "OK") {
        console.log(`OK  ${(result.durationMs / 1000).toFixed(1)}s  in:${result.tokensIn} out:${result.tokensOut}`);
      } else {
        totalErrors++;
        console.log(`ERR ${result.error?.slice(0, 100)}`);
      }
    }

    allResults.set(cfg.label, results);

    // Save CSV
    saveCsv(results, resolve(AI_DIR, csvName));
    console.log(`  → Saved ${csvName}`);

    // Save intermediate md
    writeFileSync(OUTPUT_MD, buildMarkdown(allResults, csvNames));
  }

  // Final save
  writeFileSync(OUTPUT_MD, buildMarkdown(allResults, csvNames));

  const totalTime = ((Date.now() - globalStart) / 1000 / 60).toFixed(1);
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log(`║ Done! ${totalCalls} calls, ${totalErrors} errors, ${totalTime} min`);
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`Results: ${OUTPUT_MD}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
