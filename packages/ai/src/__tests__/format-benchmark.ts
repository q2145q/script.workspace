#!/usr/bin/env npx tsx
/**
 * Format Benchmark — Tests format function across all models × 2 text sizes.
 * Short text: first 5 scenes from Мурзилка
 * Long text: full screenplay split into 2 chunks (2-stage processing)
 *
 * Run:
 *   cd packages/ai && npx tsx src/__tests__/format-benchmark.ts
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync, writeFileSync } from "fs";
import { composePrompt } from "../prompts/compose.js";
import { buildFormatPrompt } from "../providers/base.js";
import { isFixedTemperatureModel, stripCodeFences } from "../utils.js";
import type { ProviderId } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../.env.test"), override: true });

const OUTPUT_PATH = resolve(__dirname, "../../../../AI Instruction/format_result.md");
const MURZILKA_PATH = resolve(__dirname, "../../../../AI Instruction/murzilka.txt");

// ════════════════════════════════════════════
// Models (removed gpt-5-pro, gpt-5-codex, claude-3-haiku)
// ════════════════════════════════════════════

interface ModelDef {
  id: string;
  provider: ProviderId;
}

const ALL_MODELS: ModelDef[] = [
  // OpenAI GPT-5 family
  { id: "gpt-5", provider: "openai" },
  { id: "gpt-5-mini", provider: "openai" },
  { id: "gpt-5-nano", provider: "openai" },
  // OpenAI GPT-4o family
  { id: "gpt-4o", provider: "openai" },
  { id: "gpt-4o-mini", provider: "openai" },
  // OpenAI GPT-4.1 family
  { id: "gpt-4.1", provider: "openai" },
  { id: "gpt-4.1-mini", provider: "openai" },
  { id: "gpt-4.1-nano", provider: "openai" },
  // OpenAI GPT-4 legacy
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
  if (!key) throw new Error(`No API key for ${provider}`);
  return key;
}

// ════════════════════════════════════════════
// Text Preparation
// ════════════════════════════════════════════

const fullText = readFileSync(MURZILKA_PATH, "utf-8");

/** Split text by scene headings */
function splitByScenes(text: string): Array<{ heading: string; body: string; startIdx: number }> {
  const re = /^(\d+)\.\s+(НАТ\.|ИНТ\.|ЭКСТ\.|НАТ\/ИНТ\.).*$/gm;
  const matches = [...text.matchAll(re)];
  matches.sort((a, b) => a.index! - b.index!);

  const scenes: Array<{ heading: string; body: string; startIdx: number }> = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    scenes.push({
      heading: matches[i][0].trim(),
      body: text.slice(start, end).trim(),
      startIdx: start,
    });
  }
  return scenes;
}

const scenes = splitByScenes(fullText);
console.log(`Parsed ${scenes.length} scenes from screenplay (${fullText.length} chars)`);

// Short text: first 5 scenes (~3-5K chars)
const shortText = scenes.slice(0, 5).map((s) => s.body).join("\n\n");

// Long text: split full screenplay roughly in half by scene count
const midpoint = Math.ceil(scenes.length / 2);
const longTextPart1 = scenes.slice(0, midpoint).map((s) => s.body).join("\n\n");
const longTextPart2 = scenes.slice(midpoint).map((s) => s.body).join("\n\n");

console.log(`Short text: ${shortText.length} chars (scenes 1-5)`);
console.log(`Long text part 1: ${longTextPart1.length} chars (scenes 1-${midpoint})`);
console.log(`Long text part 2: ${longTextPart2.length} chars (scenes ${midpoint + 1}-${scenes.length})`);
console.log(`Long text total: ${longTextPart1.length + longTextPart2.length} chars`);

// ════════════════════════════════════════════
// API Call Functions
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
  stages?: number; // 1 or 2
}

function supportsJsonMode(model: string): boolean {
  if (model === "gpt-4") return false;
  return true;
}

async function callOpenAI(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<{ text: string; tokensIn: number; tokensOut: number; durationMs: number }> {
  const start = Date.now();
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    ...(isFixedTemperatureModel(model) ? {} : { temperature: 0.3 }),
    ...(supportsJsonMode(model) ? { response_format: { type: "json_object" as const } } : {}),
  });

  return {
    text: response.choices[0]?.message?.content || "",
    tokensIn: response.usage?.prompt_tokens ?? 0,
    tokensOut: response.usage?.completion_tokens ?? 0,
    durationMs: Date.now() - start,
  };
}

async function callAnthropic(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<{ text: string; tokensIn: number; tokensOut: number; durationMs: number }> {
  const start = Date.now();
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create(
    {
      model,
      max_tokens: 16384,
      system: [
        {
          type: "text" as const,
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        } as Anthropic.TextBlockParam,
      ],
      messages: [{ role: "user", content: userPrompt }],
    },
    { signal: AbortSignal.timeout(180_000) },
  );

  const textBlock = response.content.find((b) => b.type === "text");
  return {
    text: textBlock && textBlock.type === "text" ? textBlock.text : "",
    tokensIn: response.usage?.input_tokens ?? 0,
    tokensOut: response.usage?.output_tokens ?? 0,
    durationMs: Date.now() - start,
  };
}

async function callDeepSeek(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<{ text: string; tokensIn: number; tokensOut: number; durationMs: number }> {
  const start = Date.now();
  const client = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  return {
    text: response.choices[0]?.message?.content || "",
    tokensIn: response.usage?.prompt_tokens ?? 0,
    tokensOut: response.usage?.completion_tokens ?? 0,
    durationMs: Date.now() - start,
  };
}

async function callProvider(
  modelDef: ModelDef,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text: string; tokensIn: number; tokensOut: number; durationMs: number }> {
  const apiKey = getApiKey(modelDef.provider);
  switch (modelDef.provider) {
    case "openai":
      return callOpenAI(modelDef.id, systemPrompt, userPrompt, apiKey);
    case "anthropic":
      return callAnthropic(modelDef.id, systemPrompt, userPrompt, apiKey);
    case "deepseek":
      return callDeepSeek(modelDef.id, systemPrompt, userPrompt, apiKey);
    default:
      throw new Error(`Unsupported provider: ${modelDef.provider}`);
  }
}

// ════════════════════════════════════════════
// Format Runners
// ════════════════════════════════════════════

/** Single-stage format (short text) */
async function runFormatShort(modelDef: ModelDef): Promise<BenchResult> {
  const start = Date.now();
  try {
    const systemPrompt = composePrompt(modelDef.provider, "format", { USER_LANGUAGE: "ru" });
    const userPrompt = buildFormatPrompt({
      selectedText: shortText,
      contextBefore: "",
      contextAfter: "",
      language: "ru",
    });

    const result = await callProvider(modelDef, systemPrompt, userPrompt);

    return {
      model: modelDef.id,
      provider: modelDef.provider,
      status: "OK",
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      durationMs: Date.now() - start,
      responseText: result.text,
      stages: 1,
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
      stages: 1,
    };
  }
}

/** Two-stage format (long text — split in 2 halves) */
async function runFormatLong(modelDef: ModelDef): Promise<BenchResult> {
  const start = Date.now();
  try {
    const systemPrompt = composePrompt(modelDef.provider, "format", { USER_LANGUAGE: "ru" });

    // Stage 1: first half
    const userPrompt1 = buildFormatPrompt({
      selectedText: longTextPart1,
      contextBefore: "",
      contextAfter: longTextPart2.slice(0, 500),
      language: "ru",
    });
    const result1 = await callProvider(modelDef, systemPrompt, userPrompt1);

    // Stage 2: second half
    const userPrompt2 = buildFormatPrompt({
      selectedText: longTextPart2,
      contextBefore: longTextPart1.slice(-500),
      contextAfter: "",
      language: "ru",
    });
    const result2 = await callProvider(modelDef, systemPrompt, userPrompt2);

    // Combine responses
    const combinedText = `=== STAGE 1 (scenes 1-${midpoint}) ===\n${result1.text}\n\n=== STAGE 2 (scenes ${midpoint + 1}-${scenes.length}) ===\n${result2.text}`;

    return {
      model: modelDef.id,
      provider: modelDef.provider,
      status: "OK",
      tokensIn: result1.tokensIn + result2.tokensIn,
      tokensOut: result1.tokensOut + result2.tokensOut,
      durationMs: Date.now() - start,
      responseText: combinedText,
      stages: 2,
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
      stages: 2,
    };
  }
}

// ════════════════════════════════════════════
// Markdown Generation
// ════════════════════════════════════════════

interface TextConfig {
  label: string;
  description: string;
  inputText: string;
  inputTextPart2?: string;
}

const TEXT_CONFIGS: TextConfig[] = [
  {
    label: "Текст 1 — Короткий (сцены 1–5)",
    description: `${shortText.length} символов, ${scenes.slice(0, 5).length} сцен`,
    inputText: shortText,
  },
  {
    label: "Текст 2 — Длинный, 2 этапа (весь сценарий)",
    description: `${longTextPart1.length + longTextPart2.length} символов, ${scenes.length} сцен. Часть 1: сцены 1–${midpoint} (${longTextPart1.length} символов), Часть 2: сцены ${midpoint + 1}–${scenes.length} (${longTextPart2.length} символов)`,
    inputText: longTextPart1,
    inputTextPart2: longTextPart2,
  },
];

function buildMarkdown(allResults: Map<string, BenchResult[]>): string {
  const lines: string[] = [];

  lines.push("# Format Benchmark Results — Мурзилка");
  lines.push("");
  lines.push(`**Дата:** ${new Date().toISOString().split("T")[0]}`);
  lines.push(`**Моделей:** ${ALL_MODELS.length}`);
  lines.push(`**Сценарий:** Мурзилка (${fullText.length} символов, ${scenes.length} сцен)`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const cfg of TEXT_CONFIGS) {
    const results = allResults.get(cfg.label);
    if (!results) continue;

    lines.push(`## ${cfg.label}`);
    lines.push("");
    lines.push(`> ${cfg.description}`);
    lines.push("");

    // Show input text (truncated for readability)
    lines.push("### Входной текст");
    lines.push("");
    const showText = cfg.inputTextPart2
      ? `**Часть 1 (${cfg.inputText.length} символов):**\n\`\`\`\n${cfg.inputText.slice(0, 1500)}\n\n...[обрезано]\n\`\`\`\n\n**Часть 2 (${cfg.inputTextPart2.length} символов):**\n\`\`\`\n${cfg.inputTextPart2.slice(0, 1500)}\n\n...[обрезано]\n\`\`\``
      : `\`\`\`\n${cfg.inputText.slice(0, 3000)}${cfg.inputText.length > 3000 ? "\n\n...[обрезано]" : ""}\n\`\`\``;
    lines.push(showText);
    lines.push("");

    // Results table
    lines.push("### Результаты");
    lines.push("");
    lines.push("| Модель | Token In | Token Out | Время | Этапов | Статус |");
    lines.push("|--------|----------|-----------|-------|--------|--------|");

    for (const r of results) {
      const time = r.status === "OK" ? `${(r.durationMs / 1000).toFixed(1)}s` : "—";
      const status = r.status === "OK" ? "OK" : "ERROR";
      lines.push(
        `| ${r.model} | ${r.tokensIn} | ${r.tokensOut} | ${time} | ${r.stages ?? 1} | ${status} |`,
      );
    }
    lines.push("");

    // Full responses
    lines.push("### Полные ответы моделей");
    lines.push("");

    for (const r of results) {
      if (r.status === "OK") {
        lines.push(
          `<details><summary><b>${r.model}</b> — ${r.tokensOut} tokens, ${(r.durationMs / 1000).toFixed(1)}s</summary>`,
        );
        lines.push("");
        lines.push("```json");
        lines.push(r.responseText);
        lines.push("```");
        lines.push("");
        lines.push("</details>");
        lines.push("");
      } else {
        lines.push(
          `<details><summary><b>${r.model}</b> — ERROR</summary>`,
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
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Format Benchmark — Мурзилка × All Models  ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`Models: ${ALL_MODELS.length} | Texts: 2 (short + long 2-stage)`);
  console.log(`Short: ${shortText.length} chars | Long: ${longTextPart1.length} + ${longTextPart2.length} chars`);
  console.log("");

  const allResults = new Map<string, BenchResult[]>();
  let totalCalls = 0;
  let totalErrors = 0;
  const globalStart = Date.now();

  // ─── Short text (1 stage) ───
  console.log(`\n━━━ ${TEXT_CONFIGS[0].label} ━━━`);
  const shortResults: BenchResult[] = [];

  for (const model of ALL_MODELS) {
    process.stdout.write(`  ${model.id.padEnd(40)} `);
    const result = await runFormatShort(model);
    shortResults.push(result);
    totalCalls++;

    if (result.status === "OK") {
      console.log(`OK  ${(result.durationMs / 1000).toFixed(1)}s  in:${result.tokensIn} out:${result.tokensOut}`);
    } else {
      totalErrors++;
      console.log(`ERR ${result.error?.slice(0, 100)}`);
    }
  }

  allResults.set(TEXT_CONFIGS[0].label, shortResults);
  writeFileSync(OUTPUT_PATH, buildMarkdown(allResults));
  console.log(`  → Saved intermediate results`);

  // ─── Long text (2 stages) ───
  console.log(`\n━━━ ${TEXT_CONFIGS[1].label} ━━━`);
  const longResults: BenchResult[] = [];

  for (const model of ALL_MODELS) {
    process.stdout.write(`  ${model.id.padEnd(40)} `);
    const result = await runFormatLong(model);
    longResults.push(result);
    totalCalls += 2; // 2 API calls per model

    if (result.status === "OK") {
      console.log(`OK  ${(result.durationMs / 1000).toFixed(1)}s  in:${result.tokensIn} out:${result.tokensOut}  [2 stages]`);
    } else {
      totalErrors++;
      console.log(`ERR ${result.error?.slice(0, 100)}`);
    }
  }

  allResults.set(TEXT_CONFIGS[1].label, longResults);
  writeFileSync(OUTPUT_PATH, buildMarkdown(allResults));
  console.log(`  → Saved final results`);

  const totalTime = ((Date.now() - globalStart) / 1000 / 60).toFixed(1);
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log(`║ Done! ${totalCalls} API calls, ${totalErrors} errors, ${totalTime} min`);
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`Results: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
