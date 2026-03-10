#!/usr/bin/env npx tsx
/**
 * Knowledge Graph Benchmark — Tests extractKnowledgeGraph across all models.
 *
 * Two test configs:
 *   - Short: scenes 1-5, single-pass with jsonMode
 *   - Long: full screenplay, map-reduce (3 chunks) with jsonMode for all phases
 *
 * Run:
 *   cd packages/ai && npx tsx src/__tests__/knowledge-graph-benchmark.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../.env.test"), override: true });

import { completeAI, composePrompt } from "../index.js";
import type { ProviderId } from "../index.js";
import { estimateCost, formatCost, formatTokens } from "../pricing.js";

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
const MD_OUTPUT_PATH = resolve(AI_DIR, "knowledge_graph_result.md");
const CSV_SHORT_PATH = resolve(AI_DIR, "knowledge_graph_text1.csv");
const CSV_LONG_PATH = resolve(AI_DIR, "knowledge_graph_text2.csv");

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

// Short text: scenes 1-5
const shortText = scenes.slice(0, 5).map(s => s.text).join("\n\n");
console.log(`Short text (scenes 1-5): ${shortText.length} chars`);
console.log(`Full text: ${fullText.length} chars`);

// ════════════════════════════════════════════
// Chunk Helper for Map-Reduce (3 chunks)
// ════════════════════════════════════════════

function splitIntoChunks(text: string, numChunks: number): Array<{ text: string; range: string }> {
  const allScenes = parseScenes(text);
  if (allScenes.length === 0) {
    // Fallback: split by character count
    const chunkSize = Math.ceil(text.length / numChunks);
    return Array.from({ length: numChunks }, (_, i) => ({
      text: text.slice(i * chunkSize, (i + 1) * chunkSize),
      range: `part ${i + 1}`,
    }));
  }

  const perChunk = Math.ceil(allScenes.length / numChunks);
  const chunks: Array<{ text: string; range: string }> = [];

  for (let i = 0; i < numChunks; i++) {
    const start = i * perChunk;
    const end = Math.min(start + perChunk, allScenes.length);
    if (start >= allScenes.length) break;
    const chunkScenes = allScenes.slice(start, end);
    chunks.push({
      text: chunkScenes.map(s => s.text).join("\n\n"),
      range: `scenes ${start + 1}-${end}`,
    });
  }
  return chunks;
}

// ════════════════════════════════════════════
// Result Types
// ════════════════════════════════════════════

interface BenchmarkResult {
  model: string;
  provider: string;
  testType: "short" | "long";
  status: "OK" | "ERROR";
  text: string;
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
  cost: number;
  entitiesCount: number;
  relationshipsCount: number;
  eventsCount: number;
  error?: string;
  phases?: string; // "single-pass" | "map(3)+reduce"
}

function countGraphElements(text: string): { entities: number; relationships: number; events: number } {
  try {
    const json = JSON.parse(text);
    return {
      entities: Array.isArray(json.entities) ? json.entities.length : 0,
      relationships: Array.isArray(json.relationships) ? json.relationships.length : 0,
      events: Array.isArray(json.events) ? json.events.length : 0,
    };
  } catch {
    return { entities: 0, relationships: 0, events: 0 };
  }
}

// ════════════════════════════════════════════
// Runners
// ════════════════════════════════════════════

/** Short test: single-pass knowledge-graph with scenes 1-5 */
async function runShort(model: ModelDef): Promise<BenchmarkResult> {
  const start = Date.now();
  try {
    const apiKey = getApiKey(model.provider);
    const config = { apiKey, model: model.id };

    // Single-pass: compose "knowledge-graph" prompt (no template variables)
    const systemPrompt = composePrompt(model.provider, "knowledge-graph", {});
    const result = await completeAI(
      model.provider,
      systemPrompt,
      shortText,
      config,
      { jsonMode: true },
    );

    const counts = countGraphElements(result.text);
    const cost = estimateCost(result.usage.tokensIn, result.usage.tokensOut, model.id);

    return {
      model: model.id,
      provider: model.provider,
      testType: "short",
      status: "OK",
      text: result.text,
      tokensIn: result.usage.tokensIn,
      tokensOut: result.usage.tokensOut,
      durationMs: Date.now() - start,
      cost,
      entitiesCount: counts.entities,
      relationshipsCount: counts.relationships,
      eventsCount: counts.events,
      phases: "single-pass",
    };
  } catch (error: any) {
    return {
      model: model.id,
      provider: model.provider,
      testType: "short",
      status: "ERROR",
      text: "",
      tokensIn: 0,
      tokensOut: 0,
      durationMs: Date.now() - start,
      cost: 0,
      entitiesCount: 0,
      relationshipsCount: 0,
      eventsCount: 0,
      error: error.message || String(error),
      phases: "single-pass",
    };
  }
}

/** Long test: map-reduce with 3 chunks (map + reduce, all with jsonMode) */
async function runLong(model: ModelDef): Promise<BenchmarkResult> {
  const start = Date.now();
  let totalTokensIn = 0;
  let totalTokensOut = 0;

  try {
    const apiKey = getApiKey(model.provider);
    const config = { apiKey, model: model.id };

    // Split full text into 3 chunks
    const chunks = splitIntoChunks(fullText, 3);
    console.log(`      [map-reduce: ${chunks.length} chunks]`);

    // MAP phase: run knowledge-graph-map for each chunk with jsonMode
    const mapResults: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      process.stdout.write(`\r      [map] ${i + 1}/${chunks.length}`);

      const mapSystemPrompt = composePrompt(model.provider, "knowledge-graph-map", {
        CHUNK_RANGE: chunk.range,
      });

      const mapResult = await completeAI(
        model.provider,
        mapSystemPrompt,
        chunk.text,
        config,
        { jsonMode: true },
      );

      mapResults.push(mapResult.text);
      totalTokensIn += mapResult.usage.tokensIn;
      totalTokensOut += mapResult.usage.tokensOut;
    }
    process.stdout.write(`\r      [map] done          \n`);

    // REDUCE phase: combine map results with jsonMode
    const combinedMapResults = mapResults
      .map((text, i) => `--- Part ${i + 1} ---\n${text}`)
      .join("\n\n");

    process.stdout.write(`      [reduce] 1/1`);
    const reduceSystemPrompt = composePrompt(model.provider, "knowledge-graph-reduce", {
      MAP_RESULTS: combinedMapResults,
    });

    const reduceResult = await completeAI(
      model.provider,
      reduceSystemPrompt,
      combinedMapResults,
      config,
      { jsonMode: true },
    );

    totalTokensIn += reduceResult.usage.tokensIn;
    totalTokensOut += reduceResult.usage.tokensOut;
    process.stdout.write(`\r      [reduce] done        \n`);

    const counts = countGraphElements(reduceResult.text);
    const cost = estimateCost(totalTokensIn, totalTokensOut, model.id);

    return {
      model: model.id,
      provider: model.provider,
      testType: "long",
      status: "OK",
      text: reduceResult.text,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      durationMs: Date.now() - start,
      cost,
      entitiesCount: counts.entities,
      relationshipsCount: counts.relationships,
      eventsCount: counts.events,
      phases: `map(${chunks.length})+reduce`,
    };
  } catch (error: any) {
    return {
      model: model.id,
      provider: model.provider,
      testType: "long",
      status: "ERROR",
      text: "",
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      durationMs: Date.now() - start,
      cost: 0,
      entitiesCount: 0,
      relationshipsCount: 0,
      eventsCount: 0,
      error: error.message || String(error),
      phases: "map(3)+reduce",
    };
  }
}

// ════════════════════════════════════════════
// Output Generators
// ════════════════════════════════════════════

function buildMarkdown(
  shortResults: BenchmarkResult[],
  longResults: BenchmarkResult[],
): string {
  const lines: string[] = [];
  lines.push("# Knowledge Graph Benchmark Results");
  lines.push("");
  lines.push(`**Date:** ${new Date().toISOString().split("T")[0]}`);
  lines.push(`**Screenplay:** Murzilka (${fullText.length} chars, ${scenes.length} scenes)`);
  lines.push(`**Models:** ${ALL_MODELS.length}`);
  lines.push(`**Short text:** scenes 1-5 (${shortText.length} chars)`);
  lines.push(`**Long text:** full screenplay, map-reduce with 3 chunks`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // ─── Short Results ───
  lines.push("## Test 1: Short (Scenes 1-5, Single-Pass)");
  lines.push("");
  lines.push("| Model | Provider | Status | Time | Tokens In | Tokens Out | Cost | Entities | Relationships | Events |");
  lines.push("|-------|----------|--------|------|-----------|------------|------|----------|---------------|--------|");

  for (const r of shortResults) {
    const time = r.status === "OK" ? `${(r.durationMs / 1000).toFixed(1)}s` : "---";
    const cost = r.cost ? formatCost(r.cost) : "---";
    lines.push(
      `| ${r.model} | ${r.provider} | ${r.status} | ${time} | ${formatTokens(r.tokensIn)} | ${formatTokens(r.tokensOut)} | ${cost} | ${r.entitiesCount} | ${r.relationshipsCount} | ${r.eventsCount} |`,
    );
  }
  lines.push("");

  // Full responses (collapsible)
  for (const r of shortResults) {
    if (r.status === "OK") {
      lines.push(
        `<details><summary>${r.model} — ${r.entitiesCount} entities, ${r.relationshipsCount} rels, ${r.eventsCount} events (${(r.durationMs / 1000).toFixed(1)}s)</summary>`,
      );
      lines.push("");
      lines.push("```json");
      lines.push(r.text);
      lines.push("```");
      lines.push("");
      lines.push("</details>");
      lines.push("");
    } else {
      lines.push(`<details><summary>${r.model} — ERROR</summary>`);
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

  // ─── Long Results ───
  lines.push("## Test 2: Long (Full Screenplay, Map-Reduce 3 Chunks)");
  lines.push("");
  lines.push("| Model | Provider | Status | Time | Tokens In | Tokens Out | Cost | Entities | Relationships | Events | Phases |");
  lines.push("|-------|----------|--------|------|-----------|------------|------|----------|---------------|--------|--------|");

  for (const r of longResults) {
    const time = r.status === "OK" ? `${(r.durationMs / 1000).toFixed(1)}s` : "---";
    const cost = r.cost ? formatCost(r.cost) : "---";
    lines.push(
      `| ${r.model} | ${r.provider} | ${r.status} | ${time} | ${formatTokens(r.tokensIn)} | ${formatTokens(r.tokensOut)} | ${cost} | ${r.entitiesCount} | ${r.relationshipsCount} | ${r.eventsCount} | ${r.phases || "---"} |`,
    );
  }
  lines.push("");

  // Full responses (collapsible)
  for (const r of longResults) {
    if (r.status === "OK") {
      lines.push(
        `<details><summary>${r.model} — ${r.entitiesCount} entities, ${r.relationshipsCount} rels, ${r.eventsCount} events (${(r.durationMs / 1000).toFixed(1)}s)</summary>`,
      );
      lines.push("");
      lines.push("```json");
      lines.push(r.text);
      lines.push("```");
      lines.push("");
      lines.push("</details>");
      lines.push("");
    } else {
      lines.push(`<details><summary>${r.model} — ERROR</summary>`);
      lines.push("");
      lines.push("```");
      lines.push(r.error || "Unknown error");
      lines.push("```");
      lines.push("");
      lines.push("</details>");
      lines.push("");
    }
  }

  return lines.join("\n");
}

function buildCSV(results: BenchmarkResult[]): string {
  const header = "Model,Provider,Status,Time_s,Tokens_In,Tokens_Out,Cost_USD,Entities,Relationships,Events,Phases,Error";
  const rows = results.map(r => {
    const time = (r.durationMs / 1000).toFixed(1);
    const cost = r.cost.toFixed(4);
    const error = r.error ? `"${r.error.replace(/"/g, '""').slice(0, 200)}"` : "";
    return `${r.model},${r.provider},${r.status},${time},${r.tokensIn},${r.tokensOut},${cost},${r.entitiesCount},${r.relationshipsCount},${r.eventsCount},${r.phases || ""},${error}`;
  });
  return [header, ...rows].join("\n");
}

// ════════════════════════════════════════════
// Main
// ════════════════════════════════════════════

async function main() {
  console.log("╔═════════════════════════════════════════════════════╗");
  console.log("║   Knowledge Graph Benchmark — Murzilka Screenplay  ║");
  console.log("╚═════════════════════════════════════════════════════╝");
  console.log(`Models: ${ALL_MODELS.length}`);
  console.log(`Short text: ${shortText.length} chars (scenes 1-5, single-pass)`);
  console.log(`Long text: ${fullText.length} chars (full screenplay, map-reduce × 3 chunks)`);
  console.log("");

  const shortResults: BenchmarkResult[] = [];
  const longResults: BenchmarkResult[] = [];
  const globalStart = Date.now();
  let totalCalls = 0;
  let totalErrors = 0;

  // ─── Test 1: Short (Single-Pass) ───
  console.log("━━━ Test 1: Short (Scenes 1-5, Single-Pass) ━━━");
  console.log("");

  for (const model of ALL_MODELS) {
    process.stdout.write(`  ${model.id.padEnd(40)} `);
    const result = await runShort(model);
    shortResults.push(result);
    totalCalls++;

    if (result.status === "OK") {
      const speed = (result.durationMs / 1000).toFixed(1);
      console.log(
        `OK  ${speed}s  in:${result.tokensIn} out:${result.tokensOut}  E:${result.entitiesCount} R:${result.relationshipsCount} Ev:${result.eventsCount}`,
      );
    } else {
      totalErrors++;
      console.log(`ERR ${result.error?.slice(0, 100)}`);
    }
  }

  // Save intermediate
  writeFileSync(CSV_SHORT_PATH, buildCSV(shortResults));
  writeFileSync(MD_OUTPUT_PATH, buildMarkdown(shortResults, longResults));
  console.log(`\n  → Short results saved to CSV & MD\n`);

  // ─── Test 2: Long (Map-Reduce) ───
  console.log("━━━ Test 2: Long (Full Screenplay, Map-Reduce 3 Chunks) ━━━");
  console.log("");

  for (const model of ALL_MODELS) {
    process.stdout.write(`  ${model.id.padEnd(40)} `);
    const result = await runLong(model);
    longResults.push(result);
    totalCalls += 4; // 3 map + 1 reduce

    if (result.status === "OK") {
      const speed = (result.durationMs / 1000).toFixed(1);
      console.log(
        `OK  ${speed}s  in:${result.tokensIn} out:${result.tokensOut}  E:${result.entitiesCount} R:${result.relationshipsCount} Ev:${result.eventsCount}`,
      );
    } else {
      totalErrors++;
      console.log(`ERR ${result.error?.slice(0, 100)}`);
    }

    // Save intermediate after each long run
    writeFileSync(CSV_LONG_PATH, buildCSV(longResults));
    writeFileSync(MD_OUTPUT_PATH, buildMarkdown(shortResults, longResults));
  }

  // Final save
  writeFileSync(MD_OUTPUT_PATH, buildMarkdown(shortResults, longResults));
  writeFileSync(CSV_SHORT_PATH, buildCSV(shortResults));
  writeFileSync(CSV_LONG_PATH, buildCSV(longResults));

  const totalTime = ((Date.now() - globalStart) / 1000 / 60).toFixed(1);
  console.log("");
  console.log("╔═════════════════════════════════════════════════════╗");
  console.log(`║ Done! ${totalCalls} calls, ${totalErrors} errors, ${totalTime} min`);
  console.log("╚═════════════════════════════════════════════════════╝");
  console.log(`MD:  ${MD_OUTPUT_PATH}`);
  console.log(`CSV: ${CSV_SHORT_PATH}`);
  console.log(`CSV: ${CSV_LONG_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
