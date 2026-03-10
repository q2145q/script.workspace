#!/usr/bin/env npx tsx
/**
 * Rewrite Benchmark — Tests rewrite function across all models × 3 text sizes.
 * Uses text from Мурзилка screenplay, converted to typed blocks.
 *
 * Run:
 *   cd packages/ai && npx tsx src/__tests__/rewrite-benchmark.ts
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { writeFileSync } from "fs";
import { composePrompt } from "../prompts/compose.js";
import { buildRewritePrompt } from "../providers/base.js";
import { isFixedTemperatureModel, stripCodeFences, extractJson } from "../utils.js";
import type { ProviderId } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../.env.test"), override: true });

const OUTPUT_PATH = resolve(__dirname, "../../../../AI Instruction/rewrite_result.md");

// ════════════════════════════════════════════
// Models
// ════════════════════════════════════════════

interface ModelDef {
  id: string;
  provider: ProviderId;
}

const ALL_MODELS: ModelDef[] = [
  // OpenAI GPT-5 family
  { id: "gpt-5", provider: "openai" },
  { id: "gpt-5-pro", provider: "openai" },
  { id: "gpt-5-mini", provider: "openai" },
  { id: "gpt-5-nano", provider: "openai" },
  { id: "gpt-5-codex", provider: "openai" },
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
  { id: "claude-3-haiku-20240307", provider: "anthropic" },
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
// Three test texts from Мурзилка (typed blocks)
// ════════════════════════════════════════════

interface TestText {
  label: string;
  description: string;
  blocks: Array<{ type: string; text: string }>;
  nodeType: string;
  instruction: string;
  contextBefore: string;
  contextAfter: string;
}

const TEXT_SMALL: TestText = {
  label: "Текст 1 — Короткий диалог (4 блока)",
  description: "Сцена 1: Капитан Блад и Боцман видят падающий космический корабль",
  blocks: [
    { type: "character", text: "КАПИТАН БЛАД" },
    { type: "dialogue", text: "Дева Мария! Что это?!" },
    { type: "character", text: "БОЦМАН" },
    { type: "dialogue", text: "Сто чертей мне в бок!" },
  ],
  nodeType: "dialogue",
  instruction: "Сделай диалог более драматичным и эмоциональным, добавь напряжения",
  contextBefore:
    "Камера двигается к пиратскому кораблю, переделанному испанскому каперу, на носу которого красуется название «Арабелла». Корсары продолжают наседать, прыгать на палубу испанского галеона, а камера долетает до кормы, где за штурвалом стоит героического вида КАПИТАН БЛАД. Он явно доволен ходом сражения, улыбается. Вдруг шум баталии перекрывает какой-то грандиозный взрыв, Капитан и Боцман оборачиваются и отрывают рты:",
  contextAfter:
    "Камера поворачивает в направлении их взглядов и мы видим огромный космический корабль, падающий с небес в море. Контакт с водой, поднимается гигантская волна. Капитан и Боцман переглядываются, но не успевают перекинуться и словом, снова их внимание привлекает звук.",
};

const TEXT_MEDIUM: TestText = {
  label: "Текст 2 — Средняя сцена (11 блоков)",
  description: "Сцена 4: Семья играет в Рисованьку — раскрытие персонажей",
  blocks: [
    { type: "sceneHeading", text: "ИНТ. КВАРТИРА АВТОРА - ВЕЧЕР" },
    {
      type: "action",
      text: 'В комнате-библиотеке разместились ПАПА-пилот (30), АНТОН-Командир (10) и НАДЯ-мичман (3), у которой на коленках сидит собачка Тишка. Звездолет собран из подушек, натянутого покрывала и обувных коробок. На головах хоккейные шлемы, доспехи вырезаны из картона и украшены фломастерами. Папа и Антон вооружены фломастерами и рисуют на больших листах комиксы - мы можем узнать сцены, которые видели до этого. Антон шмыгает носом, вздыхает, осуждающе смотрит на Надю.',
    },
    { type: "character", text: "АНТОН" },
    { type: "dialogue", text: "Мичман Надюша! Не папа, а товарищ капитан!" },
    { type: "action", text: "Папа улыбается, Надя отдает честь и заливается смехом." },
    { type: "character", text: "НАДЯ" },
    { type: "dialogue", text: "Слушаюсь!" },
    { type: "character", text: "АНТОН" },
    { type: "dialogue", text: "На чём мы остановились?" },
    { type: "character", text: "ПАПА" },
    { type: "dialogue", text: "Боевые корабли на плече Ориона." },
  ],
  nodeType: "dialogue",
  instruction: "Добавь больше деталей и эмоций в диалоги, сделай семейную атмосферу теплее и живее",
  contextBefore:
    "Кабина звездолета начинает исчезать, проявляя уютную московскую квартиру",
  contextAfter:
    "5. НАТ. БЕТЕЛЬГЕЙЗЕ. ЛЕВОЕ ПЛЕЧО ОРИОНА\nНаш корабль влетает внутрь дредноута, в взлетный отсек. Корабль зависает в воздухе, у него открывается задний шлюз.",
};

const TEXT_LARGE: TestText = {
  label: "Текст 3 — Большой фрагмент (30 блоков, сцены 10-14)",
  description: "Сцены 10–14: Битва на мостике Бездны с интеркатами в квартиру — выбор оружия злодея",
  blocks: [
    // Scene 10
    { type: "sceneHeading", text: "ИНТ. КАПИТАНСКИЙ МОСТИК БЕЗДНЫ" },
    { type: "action", text: "Антон уничтожает последнего киборга." },
    { type: "character", text: "АНТОН" },
    { type: "dialogue", text: "Именем Космической Федерации, ты арестован!" },
    { type: "action", text: "Бездна зловеще смеется." },
    { type: "character", text: "КАПИТАН БЕЗДНА" },
    { type: "dialogue", text: "Ты опоздал, Землянин!" },
    {
      type: "action",
      text: "Он встаёт из своего трона, угрожающе нависает над Антоном. За спиной Бездны огромный панорамный иллюминатор, за которым продолжается грандиозный космический бой. Бездна пускает энергетическую волну и Антона сносит. Капитан демонически хохочет.",
    },
    { type: "character", text: "КАПИТАН БЕЗДНА" },
    { type: "dialogue", text: "Сейчас ты отправишься в бездну забвения!" },
    {
      type: "action",
      text: "Он поворачивается на камеру и поднимает руку, на ней мы видим магическую перчатку, вроде как у Таноса. Он сжимает пальцы, чтобы щелкнуть ими",
    },
    // Scene 11
    { type: "sceneHeading", text: "ИНТ. КВАРТИРА АВТОРА - ВЕЧЕР" },
    { type: "character", text: "ПАПА" },
    { type: "dialogue", text: "Погоди, могучее оружие в виде перчатки?" },
    { type: "character", text: "НАДЯ" },
    { type: "dialogue", text: "Как глупо!" },
    { type: "action", text: "Антон задумывается на секунду." },
    { type: "character", text: "АНТОН" },
    { type: "dialogue", text: "Ну да, ерунда какая-то! А как он выглядит? Может шар?" },
    // Scene 12
    { type: "sceneHeading", text: "ИНТ. КАПИТАНСКИЙ МОСТИК БЕЗДНЫ" },
    { type: "action", text: "Бездна поворачивается на камеру, в руке у него магический шар." },
    { type: "character", text: "ПАПА" },
    { type: "dialogue", text: "Нет, он как гадалка. Пусть будет скипетр" },
    { type: "action", text: "Бездна поворачивается на камеру, в руке у него магический скипетр." },
    { type: "character", text: "АНТОН" },
    { type: "dialogue", text: "Людовик шестнадцатый" },
    { type: "character", text: "НАДЯ" },
    { type: "dialogue", text: "Мороженое!" },
    { type: "action", text: "Бездна поворачивается на камеру, в руке у него магическое эскимо." },
    // Scene 13
    { type: "sceneHeading", text: "ИНТ. КВАРТИРА АВТОРА - ВЕЧЕР" },
    { type: "action", text: "Надя прыгает на кресле." },
    { type: "character", text: "НАДЯ" },
    { type: "dialogue", text: "Нет! Нет! Придумала!" },
    { type: "action", text: "Надя хватает висящий рядом фотоаппарат." },
    { type: "character", text: "НАДЯ" },
    { type: "dialogue", text: "Вот!" },
    { type: "action", text: "Папа смеется, смотрит на Антона, пожимает плечами." },
    { type: "character", text: "ПАПА" },
    { type: "dialogue", text: "Все равно это менее глупо чем мега перчатка." },
    // Scene 14
    { type: "sceneHeading", text: "ИНТ. КАПИТАНСКИЙ МОСТИК БЕЗДНЫ" },
    { type: "action", text: "Бездна поворачивается на камеру, в руке у него магический фотоаппарат. Антон поднимается" },
    { type: "character", text: "АНТОН" },
    { type: "dialogue", text: "Бездна, остановись! Ты погубишь галактику!" },
    { type: "character", text: "КАПИТАН БЕЗДНА" },
    { type: "dialogue", text: "Ну и что?! Недаром же меня называют потрошителем миров!" },
    {
      type: "action",
      text: "Он хохочет, картинно вскинув руки, слышен собачий лай. Это Надя, Папа и Мишка пришли на подмогу Антону. Бездна затравленно оглядывается, видит собаку, ему дурнеет.",
    },
    { type: "character", text: "КАПИТАН БЕЗДНА" },
    { type: "dialogue", text: "Только не это! Земная собака! Вы же знаете, что у меня аллергия! Я погибнуууу!" },
  ],
  nodeType: "dialogue",
  instruction: "Сделай все диалоги более яркими и запоминающимися, добавь юмора и детских эмоций, сохрани динамику интеркатов между мостиком и квартирой",
  contextBefore:
    "Антон, направляет свой ранец к пролому, попутно отбиваясь от киборгов. Наконец он влетает на капитанский мостик.",
  contextAfter:
    "ГОЛОС ПАПЫ\nИ Капитан Бездна активирует гиперболоид, миры снова смешиваются и все переносятся…",
};

const ALL_TEXTS = [TEXT_SMALL, TEXT_MEDIUM, TEXT_LARGE];

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
}

/** Does this model support response_format: json_object? */
function supportsJsonMode(model: string): boolean {
  // gpt-4 (original, 0613) does NOT support json mode
  if (model === "gpt-4") return false;
  // claude-3-haiku also doesn't (handled via Anthropic path)
  return true;
}

/** Models that only work with Responses API (v1/responses) */
function requiresResponsesAPI(model: string): boolean {
  return model === "gpt-5-pro" || model === "gpt-5-codex";
}

async function callOpenAI(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<BenchResult> {
  const start = Date.now();
  try {
    const client = new OpenAI({ apiKey });

    if (requiresResponsesAPI(model)) {
      // Use Responses API for models that don't support chat completions
      const response = await client.responses.create({
        model,
        instructions: systemPrompt,
        input: userPrompt,
        text: { format: { type: "json_object" } },
      });

      const text = response.output_text || "";
      const durationMs = Date.now() - start;

      return {
        model,
        provider: "openai",
        status: "OK",
        tokensIn: response.usage?.input_tokens ?? 0,
        tokensOut: response.usage?.output_tokens ?? 0,
        durationMs,
        responseText: text,
      };
    }

    // Standard Chat Completions API
    const params: OpenAI.ChatCompletionCreateParamsNonStreaming = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      ...(isFixedTemperatureModel(model) ? {} : { temperature: 0.7 }),
      ...(supportsJsonMode(model) ? { response_format: { type: "json_object" as const } } : {}),
    };

    const response = await client.chat.completions.create(params);
    const text = response.choices[0]?.message?.content || "";
    const durationMs = Date.now() - start;

    return {
      model,
      provider: "openai",
      status: "OK",
      tokensIn: response.usage?.prompt_tokens ?? 0,
      tokensOut: response.usage?.completion_tokens ?? 0,
      durationMs,
      responseText: text,
    };
  } catch (err: any) {
    return {
      model,
      provider: "openai",
      status: "ERROR",
      tokensIn: 0,
      tokensOut: 0,
      durationMs: Date.now() - start,
      responseText: "",
      error: err.message || String(err),
    };
  }
}

async function callAnthropic(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<BenchResult> {
  const start = Date.now();
  try {
    const client = new Anthropic({ apiKey });
    // claude-3-haiku has 4096 max_tokens limit
    const maxTokens = model.startsWith("claude-3-") ? 4096 : 16384;
    const response = await client.messages.create(
      {
        model,
        max_tokens: maxTokens,
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
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const durationMs = Date.now() - start;

    return {
      model,
      provider: "anthropic",
      status: "OK",
      tokensIn: response.usage?.input_tokens ?? 0,
      tokensOut: response.usage?.output_tokens ?? 0,
      durationMs,
      responseText: text,
    };
  } catch (err: any) {
    return {
      model,
      provider: "anthropic",
      status: "ERROR",
      tokensIn: 0,
      tokensOut: 0,
      durationMs: Date.now() - start,
      responseText: "",
      error: err.message || String(err),
    };
  }
}

async function callDeepSeek(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<BenchResult> {
  const start = Date.now();
  try {
    const client = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content || "";
    const durationMs = Date.now() - start;

    return {
      model,
      provider: "deepseek",
      status: "OK",
      tokensIn: response.usage?.prompt_tokens ?? 0,
      tokensOut: response.usage?.completion_tokens ?? 0,
      durationMs,
      responseText: text,
    };
  } catch (err: any) {
    return {
      model,
      provider: "deepseek",
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
// Runner
// ════════════════════════════════════════════

async function runRewrite(
  modelDef: ModelDef,
  testText: TestText,
): Promise<BenchResult> {
  const apiKey = getApiKey(modelDef.provider);

  // Build prompts using the same logic as the production code
  const systemPrompt = composePrompt(modelDef.provider, "rewrite", {
    USER_LANGUAGE: "ru",
  });

  const selectedText = testText.blocks
    .map((b) => (b.type === "character" ? b.text : b.text))
    .join("\n");

  const userPrompt = buildRewritePrompt({
    selectedText,
    instruction: testText.instruction,
    contextBefore: testText.contextBefore,
    contextAfter: testText.contextAfter,
    nodeType: testText.nodeType,
    blocks: testText.blocks,
    language: "ru",
  });

  switch (modelDef.provider) {
    case "openai":
      return callOpenAI(modelDef.id, systemPrompt, userPrompt, apiKey);
    case "anthropic":
      return callAnthropic(modelDef.id, systemPrompt, userPrompt, apiKey);
    case "deepseek":
      return callDeepSeek(modelDef.id, systemPrompt, userPrompt, apiKey);
    default:
      return {
        model: modelDef.id,
        provider: modelDef.provider,
        status: "ERROR",
        tokensIn: 0,
        tokensOut: 0,
        durationMs: 0,
        responseText: "",
        error: `Unsupported provider: ${modelDef.provider}`,
      };
  }
}

// ════════════════════════════════════════════
// Markdown Generation
// ════════════════════════════════════════════

function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

function buildMarkdown(
  allResults: Map<string, BenchResult[]>,
): string {
  const lines: string[] = [];

  lines.push("# Rewrite Benchmark Results — Мурзилка");
  lines.push("");
  lines.push(`**Дата:** ${new Date().toISOString().split("T")[0]}`);
  lines.push(`**Моделей:** ${ALL_MODELS.length}`);
  lines.push(`**Текстов:** ${ALL_TEXTS.length}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const testText of ALL_TEXTS) {
    const results = allResults.get(testText.label);
    if (!results) continue;

    lines.push(`## ${testText.label}`);
    lines.push("");
    lines.push(`> ${testText.description}`);
    lines.push("");

    // Show the full request (blocks + instruction)
    lines.push("### Запрос");
    lines.push("");
    lines.push("**Блоки:**");
    lines.push("```");
    for (const b of testText.blocks) {
      lines.push(`[${b.type}] ${b.text}`);
    }
    lines.push("```");
    lines.push("");
    lines.push(`**Инструкция:** ${testText.instruction}`);
    lines.push("");
    lines.push(`**Контекст до:** ${testText.contextBefore.slice(0, 200)}...`);
    lines.push("");
    lines.push(`**Контекст после:** ${testText.contextAfter.slice(0, 200)}...`);
    lines.push("");

    // Results table
    lines.push("### Результаты");
    lines.push("");
    lines.push("| Модель | Token In | Token Out | Время | Статус |");
    lines.push("|--------|----------|-----------|-------|--------|");

    for (const r of results) {
      const time = r.status === "OK" ? `${(r.durationMs / 1000).toFixed(1)}s` : "—";
      const status = r.status === "OK" ? "OK" : `ERROR`;
      lines.push(
        `| ${r.model} | ${r.tokensIn} | ${r.tokensOut} | ${time} | ${status} |`,
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
  console.log("╔═══════════════════════════════════════════════╗");
  console.log("║   Rewrite Benchmark — Мурзилка × All Models  ║");
  console.log("╚═══════════════════════════════════════════════╝");
  console.log(`Models: ${ALL_MODELS.length} | Texts: ${ALL_TEXTS.length} | Total: ${ALL_MODELS.length * ALL_TEXTS.length} calls`);
  console.log("");

  const allResults = new Map<string, BenchResult[]>();
  let totalCalls = 0;
  let totalErrors = 0;
  const globalStart = Date.now();

  for (const testText of ALL_TEXTS) {
    console.log(`\n━━━ ${testText.label} ━━━`);
    const textResults: BenchResult[] = [];

    for (const model of ALL_MODELS) {
      process.stdout.write(`  ${model.id.padEnd(40)} `);
      const result = await runRewrite(model, testText);
      textResults.push(result);
      totalCalls++;

      if (result.status === "OK") {
        const speed = (result.durationMs / 1000).toFixed(1);
        console.log(`OK  ${speed}s  in:${result.tokensIn} out:${result.tokensOut}`);
      } else {
        totalErrors++;
        const errMsg = result.error?.slice(0, 100) || "Unknown";
        console.log(`ERR ${errMsg}`);
      }
    }

    allResults.set(testText.label, textResults);

    // Save intermediate results
    writeFileSync(OUTPUT_PATH, buildMarkdown(allResults));
    console.log(`  → Saved intermediate results`);
  }

  // Final save
  writeFileSync(OUTPUT_PATH, buildMarkdown(allResults));

  const totalTime = ((Date.now() - globalStart) / 1000 / 60).toFixed(1);
  console.log("\n╔═══════════════════════════════════════════════╗");
  console.log(`║ Done! ${totalCalls} calls, ${totalErrors} errors, ${totalTime} min`);
  console.log("╚═══════════════════════════════════════════════╝");
  console.log(`Results: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
