#!/usr/bin/env npx tsx
/**
 * Describe-Location Benchmark — Tests location description across all models × 2 context sizes.
 * Short: first 5 scenes containing "КВАРТИРА" as context
 * Long: first 20 scenes containing "КВАРТИРА" as context
 *
 * No JSON mode — plain text output.
 * No map-reduce — single pass per location.
 *
 * Run:
 *   cd packages/ai && npx tsx src/__tests__/describe-location-benchmark.ts
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
const OUTPUT_MD = resolve(AI_DIR, "describe_location_result.md");
const MURZILKA_PATH = resolve(AI_DIR, "murzilka.txt");

// ════════════════════════════════════════════
// Models (17 total)
// ════════════════════════════════════════════

interface ModelDef { id: string; provider: ProviderId }

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

// Filter scenes that mention КВАРТИРА (case-insensitive)
const kvartiraScenes = scenes.filter(s =>
  s.heading.toUpperCase().includes("КВАРТИРА") || s.body.toUpperCase().includes("КВАРТИРА"),
);
console.log(`Found ${kvartiraScenes.length} scenes mentioning КВАРТИРА`);

const shortContext = kvartiraScenes.slice(0, 5).map(s => s.body).join("\n\n");
const longContext = kvartiraScenes.slice(0, 20).map(s => s.body).join("\n\n");

console.log(`Short context: ${shortContext.length} chars (${Math.min(5, kvartiraScenes.length)} scenes)`);
console.log(`Long context: ${longContext.length} chars (${Math.min(20, kvartiraScenes.length)} scenes)`);

// ════════════════════════════════════════════
// Test Configs
// ════════════════════════════════════════════

interface TestConfig {
  label: string;
  description: string;
  userPrompt: string;
}

const TEST_CONFIGS: TestConfig[] = [
  {
    label: "Описание локации 1 — Короткий контекст (5 сцен)",
    description: `Локация КВАРТИРА, первые 5 сцен (${shortContext.length} символов) — single-pass, plain text`,
    userPrompt: `Локация: КВАРТИРА\n\nКонтекст из сценария:\n${shortContext}`,
  },
  {
    label: "Описание локации 2 — Длинный контекст (20 сцен)",
    description: `Локация КВАРТИРА, первые 20 сцен (${longContext.length} символов) — single-pass, plain text`,
    userPrompt: `Локация: КВАРТИРА\n\nКонтекст из сценария:\n${longContext}`,
  },
];

// ════════════════════════════════════════════
// Result type
// ════════════════════════════════════════════

interface BenchResult {
  model: string; provider: string; status: "OK" | "ERROR";
  tokensIn: number; tokensOut: number; durationMs: number;
  responseText: string; error?: string;
}

// ════════════════════════════════════════════
// Runner — single pass, no JSON, no map-reduce
// ════════════════════════════════════════════

async function runSingle(modelDef: ModelDef, userPrompt: string): Promise<BenchResult> {
  const start = Date.now();
  try {
    const apiKey = getApiKey(modelDef.provider);
    const systemPrompt = composePrompt(modelDef.provider, "describe-location", {
      USER_LANGUAGE: "ru",
    });

    const result = await completeAI(
      modelDef.provider,
      systemPrompt,
      userPrompt,
      { apiKey, model: modelDef.id },
      { jsonMode: false },
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
  lines.push("# Describe-Location Benchmark Results — Мурзилка");
  lines.push("");
  lines.push(`**Дата:** ${new Date().toISOString().split("T")[0]}`);
  lines.push(`**Моделей:** ${ALL_MODELS.length}`);
  lines.push(`**Тестов:** ${TEST_CONFIGS.length}`);
  lines.push(`**Локация:** КВАРТИРА`);
  lines.push(`**Режим:** Plain text (без JSON), single-pass (без map-reduce)`);
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

    // Full responses in collapsible sections
    for (const r of results) {
      if (r.status === "OK") {
        lines.push(
          `<details><summary>${r.model} — Ответ (${r.tokensOut} tokens, ${(r.durationMs / 1000).toFixed(1)}s)</summary>`,
        );
        lines.push("");
        lines.push(r.responseText);
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
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   Describe-Location Benchmark — КВАРТИРА × All Models      ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`Models: ${ALL_MODELS.length} | Tests: ${TEST_CONFIGS.length}`);
  console.log(`Output: plain text, single-pass (no JSON, no map-reduce)\n`);

  const allResults = new Map<string, BenchResult[]>();
  const csvNames: string[] = [];
  let totalCalls = 0, totalErrors = 0;
  const globalStart = Date.now();

  for (let ti = 0; ti < TEST_CONFIGS.length; ti++) {
    const cfg = TEST_CONFIGS[ti];
    const csvName = `describe_location_text${ti + 1}.csv`;
    csvNames.push(csvName);

    console.log(`\n━━━ ${cfg.label} ━━━`);
    const results: BenchResult[] = [];

    for (const model of ALL_MODELS) {
      process.stdout.write(`  ${model.id.padEnd(40)} `);

      const result = await runSingle(model, cfg.userPrompt);
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
    saveCsv(results, resolve(AI_DIR, csvName));
    console.log(`  → Saved ${csvName}`);
    writeFileSync(OUTPUT_MD, buildMarkdown(allResults, csvNames));
  }

  writeFileSync(OUTPUT_MD, buildMarkdown(allResults, csvNames));

  const totalTime = ((Date.now() - globalStart) / 1000 / 60).toFixed(1);
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║ Done! ${totalCalls} calls, ${totalErrors} errors, ${totalTime} min`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);
  console.log(`Results: ${OUTPUT_MD}`);
}

main().catch((err) => { console.error("Fatal error:", err); process.exit(1); });
