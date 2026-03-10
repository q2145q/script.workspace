#!/usr/bin/env npx tsx
/**
 * AI Benchmark — Tests all AI functions × all models with Мурзилка screenplay.
 *
 * Run:
 *   cd packages/ai && npx tsx src/__tests__/benchmark.ts
 *
 * Options:
 *   --task=analyzeScene    Run only a specific task
 *   --model=gpt-4o         Run only a specific model
 *   --skip-mapreduce       Skip map-reduce functions (Group B)
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../.env.test"), override: true });

import {
  completeAI,
  composePrompt,
  streamChat,
  mapReduce,
  needsMapReduce,
} from "../index.js";

import type {
  ProviderId,
  StreamUsageResult,
} from "../index.js";

import { buildRewritePrompt, buildFormatPrompt } from "../providers/base.js";

// ════════════════════════════════════════════
// CLI Arguments
// ════════════════════════════════════════════

const args = process.argv.slice(2);
const filterTask = args.find(a => a.startsWith("--task="))?.split("=")[1];
const filterModel = args.find(a => a.startsWith("--model="))?.split("=")[1];
const skipMapReduce = args.includes("--skip-mapreduce");

// ════════════════════════════════════════════
// Models
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
  { id: "claude-sonnet-4-6", provider: "anthropic" },
  { id: "claude-sonnet-4-5-20250929", provider: "anthropic" },
  { id: "claude-sonnet-4-20250514", provider: "anthropic" },
  { id: "claude-haiku-4-5-20251001", provider: "anthropic" },
  { id: "claude-3-haiku-20240307", provider: "anthropic" },
  // DeepSeek
  { id: "deepseek-chat", provider: "deepseek" },
];

const MODELS = filterModel
  ? ALL_MODELS.filter(m => m.id === filterModel)
  : ALL_MODELS;

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

const OUTPUT_PATH = resolve(__dirname, "../../../../AI Instruction/BENCHMARK_RESULTS.md");
const fullText = readFileSync(
  resolve(__dirname, "../../../../AI Instruction/murzilka.txt"),
  "utf-8",
);

// Parse screenplay into scenes
function parseScenes(text: string) {
  const re = /^(\d+)\.\s+(НАТ\.|ИНТ\.|НАТ\/ИНТ\.|ИНТ\/НАТ\.|ИНТ\.|ЭКСТ\.).+$/gm;
  // Also match pattern "69. 69. ИНТ." (double-numbered scenes in the script)
  const re2 = /^\d+\.\s+\d+\.\s+(НАТ\.|ИНТ\.|НАТ\/ИНТ\.|ИНТ\/НАТ\.|ИНТ\.|ЭКСТ\.).+$/gm;
  const matches = [...text.matchAll(re), ...text.matchAll(re2)];
  // Sort by position in text
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

const scene1 = scenes[0]!; // НАТ. НАВЕТРЕННЫЙ ПРОЛИВ - ВЕЧЕР (pirates)
const scene4 = scenes[3]!; // ИНТ. КВАРТИРА АВТОРА - ВЕЧЕР (family)

// ════════════════════════════════════════════
// Test Data Preparation
// ════════════════════════════════════════════

// Dialogue blocks from scene 4
const dialogueBlocksText = [
  "[character] АНТОН",
  "[dialogue] Мичман Надюша! Не папа, а товарищ капитан!",
  "[character] НАДЯ",
  "[dialogue] Слушаюсь!",
  "[character] АНТОН",
  "[dialogue] На чём мы остановились?",
  "[character] ПАПА",
  "[dialogue] Боевые корабли на плече Ориона.",
].join("\n");

// Unformatted text for format (plain text without screenplay markers)
const unformattedText = `Наветренный пролив. Вечер. Медитативная безмятежность подводного мира карибского моря. Слышен глухой взрыв, яркие всполохи света распугивают рыб. Мимо камеры пролетают золотые дублоны. Камера поднимается и видит тонущий испанский галеон. На палубе стоят крики, пушки срывает с мест. Капитан Блад стоит за штурвалом. Он улыбается. Вдруг грандиозный взрыв. Капитан Блад говорит Дева Мария! Что это?! Боцман отвечает Сто чертей мне в бок! Они видят огромный космический корабль, падающий с небес в море.`;

// Rewrite user prompt
const rewriteUserPrompt = buildRewritePrompt({
  selectedText: "КАПИТАН БЛАД\nДева Мария! Что это?!\nБОЦМАН\nСто чертей мне в бок!",
  instruction: "Сделай диалог более драматичным и эмоциональным, добавь напряжения",
  contextBefore: scene1.text.slice(0, 500),
  contextAfter: scene1.text.slice(500, 1000),
  nodeType: "dialogue",
  blocks: [
    { type: "character", text: "КАПИТАН БЛАД" },
    { type: "dialogue", text: "Дева Мария! Что это?!" },
    { type: "character", text: "БОЦМАН" },
    { type: "dialogue", text: "Сто чертей мне в бок!" },
  ],
  language: "ru",
});

// Format user prompt
const formatUserPrompt = buildFormatPrompt({
  selectedText: unformattedText,
  contextBefore: "",
  contextAfter: "",
  language: "ru",
});

// DialoguePass user prompt
const dialoguePassUserPrompt = [
  `Selected dialogue blocks:\n${dialogueBlocksText}`,
  `Context before: ${scene4.text.slice(0, 300)}`,
  `Context after: ${scene4.text.slice(300, 600)}`,
  `Character info: Антон — мальчик 10 лет, командир в воображаемой космической игре. Надя — его сестра, 3 года, мичман. Папа — отец, 30 лет, пилот.`,
].join("\n\n");

// Character context (first 10 scenes mentioning Антон)
const characterContext = scenes
  .filter(s => s.text.includes("Антон"))
  .slice(0, 5)
  .map(s => s.text)
  .join("\n\n")
  .slice(0, 5000);

// Location context
const locationContext = scenes
  .filter(s => s.text.toLowerCase().includes("замок") || s.text.includes("Мышиного"))
  .slice(0, 3)
  .map(s => s.text)
  .join("\n\n")
  .slice(0, 3000);

// Scene list for assignActs
const sceneListForActs = scenes
  .map((s, i) => `Scene ${i}: ${s.heading}`)
  .join("\n");

// Screenplay structure for chat
const screenplayStructure = scenes
  .map(s => s.heading)
  .join("\n");

// ════════════════════════════════════════════
// Benchmark Task Definitions
// ════════════════════════════════════════════

interface BenchmarkTask {
  name: string;
  description: string;
  taskName: string;
  jsonMode: boolean;
  useMapReduce: boolean;
  isStreaming: boolean;
  getVariables: () => Record<string, string>;
  getUserPrompt: () => string;
}

const ALL_TASKS: BenchmarkTask[] = [
  // ─── Group A: Single Scene ───
  {
    name: "analyzeScene",
    description: "Анализ сцены",
    taskName: "analysis",
    jsonMode: true,
    useMapReduce: false,
    isStreaming: false,
    getVariables: () => ({ SCENE_TEXT: scene1.text, USER_LANGUAGE: "ru" }),
    getUserPrompt: () => scene1.text,
  },
  {
    name: "rewrite",
    description: "Переписывание текста",
    taskName: "rewrite",
    jsonMode: true,
    useMapReduce: false,
    isStreaming: false,
    getVariables: () => ({ USER_LANGUAGE: "ru" }),
    getUserPrompt: () => rewriteUserPrompt,
  },
  {
    name: "format",
    description: "Форматирование в блоки сценария",
    taskName: "format",
    jsonMode: true,
    useMapReduce: false,
    isStreaming: false,
    getVariables: () => ({ USER_LANGUAGE: "ru" }),
    getUserPrompt: () => formatUserPrompt,
  },
  {
    name: "dialoguePass",
    description: "Улучшение диалогов",
    taskName: "dialogue-pass",
    jsonMode: true,
    useMapReduce: false,
    isStreaming: false,
    getVariables: () => ({ USER_LANGUAGE: "ru" }),
    getUserPrompt: () => dialoguePassUserPrompt,
  },
  {
    name: "generateSceneSynopsis",
    description: "Синопсис сцены",
    taskName: "scene-synopsis",
    jsonMode: false,
    useMapReduce: false,
    isStreaming: false,
    getVariables: () => ({ USER_LANGUAGE: "ru" }),
    getUserPrompt: () => `Scene heading: ${scene1.heading}\n\nScene text:\n${scene1.text}`,
  },

  // ─── Group B: Full Text (Map-Reduce) ───
  {
    name: "analyzeCharacters",
    description: "Анализ персонажей",
    taskName: "character-analysis",
    jsonMode: true,
    useMapReduce: true,
    isStreaming: false,
    getVariables: () => ({ USER_LANGUAGE: "ru" }),
    getUserPrompt: () => fullText,
  },
  {
    name: "analyzeStructure",
    description: "Анализ структуры",
    taskName: "structure-analysis",
    jsonMode: true,
    useMapReduce: true,
    isStreaming: false,
    getVariables: () => ({ USER_LANGUAGE: "ru" }),
    getUserPrompt: () => fullText,
  },
  {
    name: "checkConsistency",
    description: "Проверка консистентности",
    taskName: "consistency-check",
    jsonMode: true,
    useMapReduce: true,
    isStreaming: false,
    getVariables: () => ({ USER_LANGUAGE: "ru" }),
    getUserPrompt: () => fullText,
  },
  {
    name: "generateBeatSheet",
    description: "Beat Sheet (Save the Cat)",
    taskName: "beat-sheet",
    jsonMode: true,
    useMapReduce: true,
    isStreaming: false,
    getVariables: () => ({ USER_LANGUAGE: "ru" }),
    getUserPrompt: () => fullText,
  },
  {
    name: "analyzePacing",
    description: "Анализ темпа",
    taskName: "pacing-analysis",
    jsonMode: true,
    useMapReduce: true,
    isStreaming: false,
    getVariables: () => ({ USER_LANGUAGE: "ru" }),
    getUserPrompt: () => fullText,
  },
  {
    name: "generateLogline",
    description: "Генерация логлайна",
    taskName: "logline",
    jsonMode: false,
    useMapReduce: true,
    isStreaming: false,
    getVariables: () => ({
      PROJECT_CONTEXT: fullText.slice(0, 30000),
      USER_REQUEST: "",
      USER_LANGUAGE: "ru",
    }),
    getUserPrompt: () => fullText,
  },
  {
    name: "generateSynopsis",
    description: "Генерация синопсиса",
    taskName: "synopsis",
    jsonMode: false,
    useMapReduce: true,
    isStreaming: false,
    getVariables: () => ({ USER_LANGUAGE: "ru" }),
    getUserPrompt: () => fullText,
  },
  {
    name: "extractKnowledgeGraph",
    description: "Извлечение графа знаний",
    taskName: "knowledge-graph",
    jsonMode: true,
    useMapReduce: true,
    isStreaming: false,
    getVariables: () => ({ USER_LANGUAGE: "ru" }),
    getUserPrompt: () => fullText,
  },

  // ─── Group C: Specific Inputs ───
  {
    name: "describeCharacter",
    description: "Описание персонажа",
    taskName: "describe-character",
    jsonMode: false,
    useMapReduce: false,
    isStreaming: false,
    getVariables: () => ({ USER_LANGUAGE: "ru" }),
    getUserPrompt: () => `Character: Антон\n\nContext:\n${characterContext}`,
  },
  {
    name: "describeLocation",
    description: "Описание локации",
    taskName: "describe-location",
    jsonMode: false,
    useMapReduce: false,
    isStreaming: false,
    getVariables: () => ({ USER_LANGUAGE: "ru" }),
    getUserPrompt: () => `Location: Замок Мышиного Короля\n\nContext:\n${locationContext}`,
  },
  {
    name: "assignActs",
    description: "Распределение по актам",
    taskName: "act-assignment",
    jsonMode: false,
    useMapReduce: false,
    isStreaming: false,
    getVariables: () => ({ SCENE_LIST: sceneListForActs }),
    getUserPrompt: () => `Assign these ${scenes.length} scenes to acts 1, 2, or 3.`,
  },
  {
    name: "chat",
    description: "Чат-ассистент",
    taskName: "chat",
    jsonMode: false,
    useMapReduce: false,
    isStreaming: true,
    getVariables: () => ({ SCREENPLAY_STRUCTURE: screenplayStructure }),
    getUserPrompt: () => "Кто главный антагонист сценария и какова его мотивация? Проанализируй его арку.",
  },
];

const TASKS = ALL_TASKS
  .filter(t => !filterTask || t.name === filterTask)
  .filter(t => !skipMapReduce || !t.useMapReduce);

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
  mapReduceUsed?: boolean;
}

// ════════════════════════════════════════════
// Runner
// ════════════════════════════════════════════

async function runTaskForModel(
  task: BenchmarkTask,
  model: ModelDef,
): Promise<BenchmarkResult> {
  const start = Date.now();
  let mapReduceUsed = false;

  try {
    const apiKey = getApiKey(model.provider);
    const config = { apiKey, model: model.id };
    let text: string;
    let usage: StreamUsageResult;

    if (task.isStreaming) {
      // ─── Streaming Chat ───
      const result = await new Promise<{ text: string; usage: StreamUsageResult }>(
        (res, rej) => {
          const systemPrompt = composePrompt(
            model.provider,
            task.taskName,
            task.getVariables(),
          );
          let collected = "";
          streamChat(
            model.provider,
            {
              messages: [{ role: "user", content: task.getUserPrompt() }],
              systemPrompt,
              contextBlocks: fullText.slice(0, 15000),
            },
            config,
            {
              onToken: (token) => {
                collected += token;
              },
              onDone: (fullText, u) => {
                res({
                  text: fullText,
                  usage: u ?? { tokensIn: 0, tokensOut: 0, durationMs: Date.now() - start },
                });
              },
              onError: (err) => rej(err),
            },
          ).catch(rej);
        },
      );
      text = result.text;
      usage = result.usage;
    } else if (task.useMapReduce) {
      // ─── Map-Reduce Path ───
      const inputText = task.getUserPrompt();

      if (needsMapReduce(inputText, model.provider, model.id)) {
        // Text doesn't fit → map-reduce pipeline
        mapReduceUsed = true;
        console.log(`      [map-reduce activated]`);
        const mrResult = await mapReduce({
          providerId: model.provider,
          config,
          taskName: task.taskName,
          fullText: inputText,
          variables: task.getVariables(),
          concurrency: 3,
          onProgress: (current, total, phase) => {
            process.stdout.write(`\r      [${phase}] ${current}/${total}`);
          },
        });
        process.stdout.write("\r      ");
        text = mrResult.text;
        usage = mrResult.usage;
      } else {
        // Text fits → direct call
        const vars = task.getVariables();
        // For tasks that use SCENE_TEXT variable, inject it
        if (task.taskName !== "logline" && task.taskName !== "synopsis") {
          vars.SCENE_TEXT = inputText;
        }
        const systemPrompt = composePrompt(model.provider, task.taskName, vars);
        const result = await completeAI(
          model.provider,
          systemPrompt,
          inputText,
          config,
          { jsonMode: task.jsonMode },
        );
        text = result.text;
        usage = result.usage;
      }
    } else {
      // ─── Direct Completion ───
      const systemPrompt = composePrompt(
        model.provider,
        task.taskName,
        task.getVariables(),
      );
      const result = await completeAI(
        model.provider,
        systemPrompt,
        task.getUserPrompt(),
        config,
        { jsonMode: task.jsonMode },
      );
      text = result.text;
      usage = result.usage;
    }

    return {
      model: model.id,
      provider: model.provider,
      status: "OK",
      text,
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      durationMs: Date.now() - start,
      mapReduceUsed,
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
      mapReduceUsed,
    };
  }
}

// ════════════════════════════════════════════
// Markdown Output
// ════════════════════════════════════════════

function escapeForTable(s: string, maxLen = 200): string {
  const oneLine = s.replace(/\n/g, " ").replace(/\|/g, "\\|");
  return oneLine.length > maxLen ? oneLine.slice(0, maxLen) + "..." : oneLine;
}

function buildMarkdown(allResults: Map<string, BenchmarkResult[]>): string {
  const lines: string[] = [];
  lines.push("# AI Benchmark Results — Мурзилка");
  lines.push("");
  lines.push(`**Date:** ${new Date().toISOString().split("T")[0]}`);
  lines.push(`**Screenplay:** Мурзилка (${fullText.length} chars, ${scenes.length} scenes)`);
  lines.push(`**Models:** ${MODELS.length}`);
  lines.push(`**Functions:** ${TASKS.length}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const task of TASKS) {
    const results = allResults.get(task.name);
    if (!results) continue;

    lines.push(`## ${task.name} — ${task.description}`);
    lines.push("");

    // Show prompts (sample with openai provider)
    try {
      const sampleVars = task.getVariables();
      const sampleSystem = composePrompt("openai", task.taskName, sampleVars);
      const sampleUser = task.getUserPrompt();

      lines.push("### System Prompt");
      lines.push("");
      lines.push("```");
      lines.push(
        sampleSystem.length > 3000
          ? sampleSystem.slice(0, 3000) + "\n\n...[truncated at 3000 chars]"
          : sampleSystem,
      );
      lines.push("```");
      lines.push("");

      lines.push("### User Prompt");
      lines.push("");
      lines.push("```");
      lines.push(
        sampleUser.length > 2000
          ? sampleUser.slice(0, 2000) + "\n\n...[truncated at 2000 chars]"
          : sampleUser,
      );
      lines.push("```");
      lines.push("");
    } catch {
      lines.push("_(prompts could not be composed)_");
      lines.push("");
    }

    // Results table
    lines.push("### Results");
    lines.push("");
    lines.push("| Model | Provider | Speed | Tokens In | Tokens Out | Map-Reduce | Status |");
    lines.push("|-------|----------|-------|-----------|------------|------------|--------|");

    for (const r of results) {
      const speed = r.status === "OK" ? `${(r.durationMs / 1000).toFixed(1)}s` : "—";
      const mr = r.mapReduceUsed ? "Yes" : "No";
      const status = r.status === "OK" ? "OK" : `ERROR`;
      lines.push(
        `| ${r.model} | ${r.provider} | ${speed} | ${r.tokensIn} | ${r.tokensOut} | ${mr} | ${status} |`,
      );
    }
    lines.push("");

    // Full responses in collapsible sections
    for (const r of results) {
      if (r.status === "OK") {
        lines.push(
          `<details><summary>${r.model} — Full Response (${r.tokensOut} tokens, ${(r.durationMs / 1000).toFixed(1)}s)</summary>`,
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

// ════════════════════════════════════════════
// Main
// ════════════════════════════════════════════

async function main() {
  console.log("╔════════════════════════════════════════════╗");
  console.log("║   AI Benchmark — Мурзилка Screenplay      ║");
  console.log("╚════════════════════════════════════════════╝");
  console.log(`Models: ${MODELS.length} | Functions: ${TASKS.length} | Total: ~${MODELS.length * TASKS.length} calls`);
  console.log(`Text: ${fullText.length} chars, ${scenes.length} scenes`);
  if (filterTask) console.log(`Filter task: ${filterTask}`);
  if (filterModel) console.log(`Filter model: ${filterModel}`);
  if (skipMapReduce) console.log(`Skipping map-reduce functions`);
  console.log("");

  const allResults = new Map<string, BenchmarkResult[]>();
  let totalCalls = 0;
  let totalErrors = 0;
  const globalStart = Date.now();

  for (const task of TASKS) {
    console.log(`\n━━━ ${task.name} (${task.description}) ━━━`);
    const taskResults: BenchmarkResult[] = [];

    for (const model of MODELS) {
      process.stdout.write(`  ${model.id.padEnd(35)} `);
      const result = await runTaskForModel(task, model);
      taskResults.push(result);
      totalCalls++;

      if (result.status === "OK") {
        const speed = (result.durationMs / 1000).toFixed(1);
        console.log(
          `OK  ${speed}s  in:${result.tokensIn} out:${result.tokensOut}${result.mapReduceUsed ? " [MR]" : ""}`,
        );
      } else {
        totalErrors++;
        console.log(`ERR ${result.error?.slice(0, 80)}`);
      }
    }

    allResults.set(task.name, taskResults);

    // Save intermediate results after each task
    writeFileSync(OUTPUT_PATH, buildMarkdown(allResults));
    console.log(`  → Intermediate results saved to BENCHMARK_RESULTS.md`);
  }

  // Final save
  writeFileSync(OUTPUT_PATH, buildMarkdown(allResults));

  const totalTime = ((Date.now() - globalStart) / 1000 / 60).toFixed(1);
  console.log("\n╔════════════════════════════════════════════╗");
  console.log(`║ Done! ${totalCalls} calls, ${totalErrors} errors, ${totalTime} min     ║`);
  console.log("╚════════════════════════════════════════════╝");
  console.log(`Results: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
