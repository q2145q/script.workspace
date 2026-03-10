#!/usr/bin/env npx tsx
/**
 * Act-Assignment Benchmark — Tests assignActs AI function across all models.
 *
 * Two configs:
 *   - Short: first 10 scenes
 *   - Long:  all 69 scenes
 *
 * Run:
 *   cd packages/ai && npx tsx src/__tests__/act-assignment-benchmark.ts
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
const MD_OUTPUT = resolve(AI_DIR, "act_assignment_result.md");

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

// ════════════════════════════════════════════
// Build SCENE_LIST
// ════════════════════════════════════════════

function buildSceneList(sceneSubset: typeof scenes): string {
  return sceneSubset.map((s, i) => `${i}. ${s.heading}`).join("\n");
}

// Two configs
const shortScenes = scenes.slice(0, 10);
const longScenes = scenes;

const configs = [
  {
    name: "short",
    label: "Short (10 scenes)",
    sceneList: buildSceneList(shortScenes),
    sceneCount: shortScenes.length,
    csvFile: resolve(AI_DIR, "act_assignment_text1.csv"),
  },
  {
    name: "long",
    label: "Long (all 69 scenes)",
    sceneList: buildSceneList(longScenes),
    sceneCount: longScenes.length,
    csvFile: resolve(AI_DIR, "act_assignment_text2.csv"),
  },
];

// ════════════════════════════════════════════
// Result Type
// ════════════════════════════════════════════

interface BenchmarkResult {
  model: string;
  provider: string;
  config: string;
  status: "OK" | "ERROR";
  text: string;
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
  error?: string;
  parsedActs?: Array<{ sceneIndex: number; act: number }>;
  validJson: boolean;
  correctCount: boolean; // whether number of items matches scene count
}

// ════════════════════════════════════════════
// Runner
// ════════════════════════════════════════════

async function runForModel(
  model: ModelDef,
  cfg: typeof configs[0],
): Promise<BenchmarkResult> {
  const start = Date.now();

  try {
    const apiKey = getApiKey(model.provider);
    const config = { apiKey, model: model.id };

    const systemPrompt = composePrompt(model.provider, "act-assignment", {
      SCENE_LIST: cfg.sceneList,
    });

    const result = await completeAI(
      model.provider,
      systemPrompt,
      "Назначь акты для каждой сцены",
      config,
      { jsonMode: true },
    );

    // Try to parse JSON
    let parsedActs: Array<{ sceneIndex: number; act: number }> | undefined;
    let validJson = false;
    let correctCount = false;

    try {
      // Extract JSON from potential markdown fences
      let jsonStr = result.text.trim();
      const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        jsonStr = fenceMatch[1]!.trim();
      }
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        parsedActs = parsed;
        validJson = true;
        correctCount = parsed.length === cfg.sceneCount;
      }
    } catch {
      validJson = false;
    }

    return {
      model: model.id,
      provider: model.provider,
      config: cfg.name,
      status: "OK",
      text: result.text,
      tokensIn: result.usage.tokensIn,
      tokensOut: result.usage.tokensOut,
      durationMs: Date.now() - start,
      parsedActs,
      validJson,
      correctCount,
    };
  } catch (error: any) {
    return {
      model: model.id,
      provider: model.provider,
      config: cfg.name,
      status: "ERROR",
      text: "",
      tokensIn: 0,
      tokensOut: 0,
      durationMs: Date.now() - start,
      error: error.message || String(error),
      validJson: false,
      correctCount: false,
    };
  }
}

// ════════════════════════════════════════════
// Markdown & CSV Output
// ════════════════════════════════════════════

function buildMarkdown(
  allResults: Map<string, BenchmarkResult[]>,
): string {
  const lines: string[] = [];
  lines.push("# Act-Assignment Benchmark Results");
  lines.push("");
  lines.push(`**Date:** ${new Date().toISOString().split("T")[0]}`);
  lines.push(`**Screenplay:** Мурзилка (${fullText.length} chars, ${scenes.length} scenes)`);
  lines.push(`**Models:** ${ALL_MODELS.length}`);
  lines.push(`**Task:** act-assignment (JSON, single pass)`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const cfg of configs) {
    const results = allResults.get(cfg.name);
    if (!results) continue;

    lines.push(`## ${cfg.label}`);
    lines.push("");
    lines.push(`SCENE_LIST (${cfg.sceneCount} scenes):`);
    lines.push("```");
    lines.push(cfg.sceneList);
    lines.push("```");
    lines.push("");

    // Sample system prompt
    try {
      const sampleSystem = composePrompt("openai", "act-assignment", {
        SCENE_LIST: cfg.sceneList,
      });
      lines.push("### System Prompt (OpenAI sample)");
      lines.push("");
      lines.push("```");
      lines.push(
        sampleSystem.length > 3000
          ? sampleSystem.slice(0, 3000) + "\n\n...[truncated at 3000 chars]"
          : sampleSystem,
      );
      lines.push("```");
      lines.push("");
    } catch {
      lines.push("_(system prompt could not be composed)_");
      lines.push("");
    }

    // Results table
    lines.push("### Results");
    lines.push("");
    lines.push("| Model | Provider | Speed | Tokens In | Tokens Out | Valid JSON | Count OK | Status |");
    lines.push("|-------|----------|-------|-----------|------------|-----------|----------|--------|");

    for (const r of results) {
      const speed = r.status === "OK" ? `${(r.durationMs / 1000).toFixed(1)}s` : "—";
      const vj = r.validJson ? "Yes" : "No";
      const cc = r.correctCount ? "Yes" : "No";
      const status = r.status === "OK" ? "OK" : "ERROR";
      lines.push(
        `| ${r.model} | ${r.provider} | ${speed} | ${r.tokensIn} | ${r.tokensOut} | ${vj} | ${cc} | ${status} |`,
      );
    }
    lines.push("");

    // Full responses
    for (const r of results) {
      if (r.status === "OK") {
        lines.push(
          `<details><summary>${r.model} — ${(r.durationMs / 1000).toFixed(1)}s, ${r.tokensOut} tokens, JSON:${r.validJson ? "OK" : "FAIL"}, Count:${r.correctCount ? "OK" : "FAIL"}</summary>`,
        );
        lines.push("");
        lines.push("```json");
        lines.push(r.text);
        lines.push("```");
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

function buildCSV(results: BenchmarkResult[], cfg: typeof configs[0]): string {
  const lines: string[] = [];

  // Header: Model, Provider, Status, DurationMs, TokensIn, TokensOut, ValidJSON, CorrectCount, then one column per scene
  const sceneHeaders = Array.from({ length: cfg.sceneCount }, (_, i) => `Scene_${i}`);
  lines.push(
    ["Model", "Provider", "Status", "DurationMs", "TokensIn", "TokensOut", "ValidJSON", "CorrectCount", ...sceneHeaders].join(","),
  );

  for (const r of results) {
    const row: string[] = [
      r.model,
      r.provider,
      r.status,
      String(r.durationMs),
      String(r.tokensIn),
      String(r.tokensOut),
      r.validJson ? "1" : "0",
      r.correctCount ? "1" : "0",
    ];

    // Fill scene act assignments
    if (r.parsedActs && r.validJson) {
      const actMap = new Map(r.parsedActs.map(a => [a.sceneIndex, a.act]));
      for (let i = 0; i < cfg.sceneCount; i++) {
        row.push(String(actMap.get(i) ?? ""));
      }
    } else {
      for (let i = 0; i < cfg.sceneCount; i++) {
        row.push("");
      }
    }

    lines.push(row.join(","));
  }

  return lines.join("\n");
}

// ════════════════════════════════════════════
// Main
// ════════════════════════════════════════════

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  Act-Assignment Benchmark — Мурзилка Screenplay ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`Models: ${ALL_MODELS.length} | Configs: ${configs.length} | Total: ~${ALL_MODELS.length * configs.length} calls`);
  console.log(`Text: ${fullText.length} chars, ${scenes.length} scenes`);
  console.log("");

  const allResults = new Map<string, BenchmarkResult[]>();
  let totalCalls = 0;
  let totalErrors = 0;
  const globalStart = Date.now();

  for (const cfg of configs) {
    console.log(`\n━━━ ${cfg.label} ━━━`);
    console.log(`SCENE_LIST preview:\n${cfg.sceneList.split("\n").slice(0, 5).join("\n")}\n...`);
    console.log("");

    const cfgResults: BenchmarkResult[] = [];

    for (const model of ALL_MODELS) {
      process.stdout.write(`  ${model.id.padEnd(40)} `);
      const result = await runForModel(model, cfg);
      cfgResults.push(result);
      totalCalls++;

      if (result.status === "OK") {
        const speed = (result.durationMs / 1000).toFixed(1);
        const jsonOk = result.validJson ? "JSON:OK" : "JSON:FAIL";
        const countOk = result.correctCount ? `Count:${cfg.sceneCount}` : `Count:MISMATCH(${result.parsedActs?.length ?? 0}/${cfg.sceneCount})`;
        console.log(`OK  ${speed}s  in:${result.tokensIn} out:${result.tokensOut}  ${jsonOk} ${countOk}`);
      } else {
        totalErrors++;
        console.log(`ERR ${result.error?.slice(0, 100)}`);
      }
    }

    allResults.set(cfg.name, cfgResults);

    // Save CSV for this config
    writeFileSync(cfg.csvFile, buildCSV(cfgResults, cfg));
    console.log(`  → CSV saved: ${cfg.csvFile}`);

    // Save intermediate MD
    writeFileSync(MD_OUTPUT, buildMarkdown(allResults));
    console.log(`  → MD saved: ${MD_OUTPUT}`);
  }

  // Final save
  writeFileSync(MD_OUTPUT, buildMarkdown(allResults));

  const totalTime = ((Date.now() - globalStart) / 1000 / 60).toFixed(1);
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log(`║ Done! ${totalCalls} calls, ${totalErrors} errors, ${totalTime} min`);
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`MD:   ${MD_OUTPUT}`);
  for (const cfg of configs) {
    console.log(`CSV:  ${cfg.csvFile}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
