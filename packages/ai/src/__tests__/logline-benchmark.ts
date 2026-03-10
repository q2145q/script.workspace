#!/usr/bin/env npx tsx
/**
 * Logline Benchmark — Tests logline generation across all models × 2 modes.
 * Short: scenes 1–5 (~5000 chars) — single-pass logline
 * Long: full screenplay (~190K chars) — map-reduce (3 chunks → reduce)
 *
 * Run:
 *   cd packages/ai && npx tsx src/__tests__/logline-benchmark.ts
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
const OUTPUT_MD = resolve(AI_DIR, "logline_result.md");
const MURZILKA_PATH = resolve(AI_DIR, "murzilka.txt");

// ════════════════════════════════════════════
// Models (no gpt-5-pro, gpt-5-codex, claude-3-haiku)
// ════════════════════════════════════════════

interface ModelDef { id: string; provider: ProviderId }

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
    openai: "OPENAI_API_KEY", anthropic: "ANTHROPIC_API_KEY",
    deepseek: "DEEPSEEK_API_KEY", gemini: "GEMINI_API_KEY",
    yandex: "YANDEX_API_KEY", grok: "GROK_API_KEY",
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
console.log(`Parsed ${scenes.length} scenes, full text: ${fullText.length} chars`);

// Short: first 5 scenes
const shortText = scenes.slice(0, 5).map(s => s.body).join("\n\n");
// Long: full screenplay — will use map-reduce
const longText = fullText;

interface TestConfig {
  label: string;
  description: string;
  mode: "single" | "map-reduce";
  text: string;
}

const TEST_CONFIGS: TestConfig[] = [
  {
    label: "Логлайн 1 — Короткий (сцены 1–5, single-pass)",
    description: `Сцены 1–5 (${shortText.length} символов) — генерация логлайна за один вызов`,
    mode: "single",
    text: shortText,
  },
  {
    label: "Логлайн 2 — Полный сценарий (map-reduce)",
    description: `Полный сценарий (${longText.length} символов) — 3 чанка → map → reduce`,
    mode: "map-reduce",
    text: longText,
  },
];

// ════════════════════════════════════════════
// Result type
// ════════════════════════════════════════════

interface BenchResult {
  model: string; provider: string; status: "OK" | "ERROR";
  tokensIn: number; tokensOut: number; durationMs: number;
  responseText: string; error?: string;
  /** For map-reduce, total tokens across all calls */
  mapReduceDetail?: string;
}

// ════════════════════════════════════════════
// Runners
// ════════════════════════════════════════════

async function runLoglineSingle(modelDef: ModelDef, projectText: string): Promise<BenchResult> {
  const start = Date.now();
  try {
    const apiKey = getApiKey(modelDef.provider);
    const systemPrompt = composePrompt(modelDef.provider, "logline", {
      PROJECT_CONTEXT: projectText,
      USER_REQUEST: "Напиши логлайн для этого сценария",
      USER_LANGUAGE: "ru",
    });

    const result = await completeAI(
      modelDef.provider,
      systemPrompt,
      "Напиши логлайн для этого сценария",
      { apiKey, model: modelDef.id },
    );

    return {
      model: modelDef.id, provider: modelDef.provider, status: "OK",
      tokensIn: result.usage.tokensIn, tokensOut: result.usage.tokensOut,
      durationMs: Date.now() - start, responseText: result.text.trim(),
    };
  } catch (err: any) {
    return {
      model: modelDef.id, provider: modelDef.provider, status: "ERROR",
      tokensIn: 0, tokensOut: 0, durationMs: Date.now() - start,
      responseText: "", error: err.message || String(err),
    };
  }
}

function splitIntoChunks(text: string, numChunks: number): string[] {
  // Split by scenes, then distribute roughly evenly
  const sceneList = splitByScenes(text);
  const chunks: string[] = [];
  const perChunk = Math.ceil(sceneList.length / numChunks);
  for (let i = 0; i < numChunks; i++) {
    const slice = sceneList.slice(i * perChunk, (i + 1) * perChunk);
    chunks.push(slice.map(s => s.body).join("\n\n"));
  }
  return chunks;
}

async function runLoglineMapReduce(modelDef: ModelDef, projectText: string): Promise<BenchResult> {
  const start = Date.now();
  let totalIn = 0, totalOut = 0;
  try {
    const apiKey = getApiKey(modelDef.provider);
    const chunks = splitIntoChunks(projectText, 3);

    // MAP phase: process each chunk
    const mapResults: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkRange = `chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`;
      const systemPrompt = composePrompt(modelDef.provider, "logline-map", {
        CHUNK_RANGE: chunkRange,
      });

      const result = await completeAI(
        modelDef.provider,
        systemPrompt,
        chunks[i],
        { apiKey, model: modelDef.id },
      );
      totalIn += result.usage.tokensIn;
      totalOut += result.usage.tokensOut;
      mapResults.push(result.text.trim());
    }

    // REDUCE phase: combine map results into final logline
    const combinedMapResults = mapResults.map((r, i) => `--- Fragment ${i + 1} ---\n${r}`).join("\n\n");
    const reduceSystemPrompt = composePrompt(modelDef.provider, "logline-reduce", {
      MAP_RESULTS: combinedMapResults,
      USER_LANGUAGE: "ru",
    });

    const reduceResult = await completeAI(
      modelDef.provider,
      reduceSystemPrompt,
      "Сгенерируй логлайн на основе извлечённых данных",
      { apiKey, model: modelDef.id },
    );
    totalIn += reduceResult.usage.tokensIn;
    totalOut += reduceResult.usage.tokensOut;

    const detail = `3 map calls + 1 reduce call`;

    return {
      model: modelDef.id, provider: modelDef.provider, status: "OK",
      tokensIn: totalIn, tokensOut: totalOut,
      durationMs: Date.now() - start,
      responseText: reduceResult.text.trim(),
      mapReduceDetail: detail,
    };
  } catch (err: any) {
    return {
      model: modelDef.id, provider: modelDef.provider, status: "ERROR",
      tokensIn: totalIn, tokensOut: totalOut,
      durationMs: Date.now() - start,
      responseText: "", error: err.message || String(err),
    };
  }
}

// ════════════════════════════════════════════
// CSV + Markdown
// ════════════════════════════════════════════

function escapeCsv(v: string): string {
  if (v.includes(";") || v.includes("\n") || v.includes('"') || v.includes(",")) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

function saveCsv(results: BenchResult[], filePath: string) {
  const rows = ["Модель;Token In;Token Out;Время;Статус;Полный ответ модели"];
  for (const r of results) {
    rows.push([
      r.model, String(r.tokensIn), String(r.tokensOut),
      r.status === "OK" ? `${(r.durationMs / 1000).toFixed(1)}s` : "—",
      r.status, escapeCsv(r.responseText || r.error || ""),
    ].join(";"));
  }
  writeFileSync(filePath, "\uFEFF" + rows.join("\n"), "utf-8");
}

function buildMarkdown(allResults: Map<string, BenchResult[]>, csvNames: string[]): string {
  const lines: string[] = [];
  lines.push("# Logline Benchmark Results — Мурзилка");
  lines.push("");
  lines.push(`**Дата:** ${new Date().toISOString().split("T")[0]}`);
  lines.push(`**Моделей:** ${ALL_MODELS.length}`);
  lines.push(`**Тестов:** ${TEST_CONFIGS.length}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  let csvIdx = 0;
  for (const cfg of TEST_CONFIGS) {
    const results = allResults.get(cfg.label);
    if (!results) continue;
    const csvName = csvNames[csvIdx++];

    lines.push(`## ${cfg.label}`);
    lines.push("");
    lines.push(`> ${cfg.description}`);
    lines.push("");
    lines.push(`**Режим:** ${cfg.mode === "single" ? "Один вызов (logline.md)" : "Map-Reduce (3 чанка → logline-map.md → logline-reduce.md)"}`);
    lines.push("");

    lines.push("### Результаты");
    lines.push("");
    lines.push(`**CSV:** [${csvName}](./${csvName})`);
    lines.push("");

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
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║   Logline Benchmark — Мурзилка × All Models          ║");
  console.log("╚═══════════════════════════════════════════════════════╝");
  console.log(`Models: ${ALL_MODELS.length} | Tests: ${TEST_CONFIGS.length}`);
  console.log(`Short: single-pass | Long: map-reduce (3+1 calls per model)\n`);

  const allResults = new Map<string, BenchResult[]>();
  const csvNames: string[] = [];
  let totalCalls = 0, totalErrors = 0;
  const globalStart = Date.now();

  for (let ti = 0; ti < TEST_CONFIGS.length; ti++) {
    const cfg = TEST_CONFIGS[ti];
    const csvName = `logline_text${ti + 1}.csv`;
    csvNames.push(csvName);

    console.log(`\n━━━ ${cfg.label} ━━━`);
    const results: BenchResult[] = [];

    for (const model of ALL_MODELS) {
      process.stdout.write(`  ${model.id.padEnd(40)} `);

      const result = cfg.mode === "single"
        ? await runLoglineSingle(model, cfg.text)
        : await runLoglineMapReduce(model, cfg.text);

      results.push(result);
      totalCalls++;

      if (result.status === "OK") {
        const extra = result.mapReduceDetail ? ` [${result.mapReduceDetail}]` : "";
        console.log(`OK  ${(result.durationMs / 1000).toFixed(1)}s  in:${result.tokensIn} out:${result.tokensOut}${extra}`);
      } else {
        totalErrors++;
        console.log(`ERR ${result.error?.slice(0, 100)}`);
      }
    }

    allResults.set(cfg.label, results);
    saveCsv(results, resolve(AI_DIR, csvName));
    console.log(`  → Saved ${csvName}`);
    writeFileSync(OUTPUT_MD, buildMarkdown(allResults, csvNames));
  }

  writeFileSync(OUTPUT_MD, buildMarkdown(allResults, csvNames));

  const totalTime = ((Date.now() - globalStart) / 1000 / 60).toFixed(1);
  console.log(`\n╔═══════════════════════════════════════════════════════╗`);
  console.log(`║ Done! ${totalCalls} calls, ${totalErrors} errors, ${totalTime} min`);
  console.log(`╚═══════════════════════════════════════════════════════╝`);
  console.log(`Results: ${OUTPUT_MD}`);
}

main().catch((err) => { console.error("Fatal error:", err); process.exit(1); });
