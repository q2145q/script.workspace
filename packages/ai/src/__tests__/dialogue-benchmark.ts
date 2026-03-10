#!/usr/bin/env npx tsx
/**
 * Dialogue Pass Benchmark — Tests dialogue improvement across all models × 2 sizes.
 * Short: scene 4 family dialogue (4 speakers, ~8 blocks)
 * Long: scenes 10-14 battle + apartment intercuts (~30 blocks)
 *
 * Run:
 *   cd packages/ai && npx tsx src/__tests__/dialogue-benchmark.ts
 */

import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { writeFileSync } from "fs";
import { completeAI, composePrompt } from "../index.js";
import type { ProviderId } from "../index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../.env.test"), override: true });

const AI_DIR = resolve(__dirname, "../../../../AI Instruction");
const OUTPUT_MD = resolve(AI_DIR, "dialogue_result.md");

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
// Test Dialogues from Мурзилка
// ════════════════════════════════════════════

interface DialogueTest {
  label: string;
  description: string;
  blocksText: string;   // typed blocks as text for the user prompt
  contextBefore: string;
  contextAfter: string;
  characterInfo: string;
}

const SHORT_DIALOGUE: DialogueTest = {
  label: "Диалог 1 — Короткий (семейная сцена, 8 блоков)",
  description: "Сцена 4: Антон, Надя и Папа играют в Рисованьку — тёплый семейный диалог",
  blocksText: [
    "[character] АНТОН",
    "[dialogue] Мичман Надюша! Не папа, а товарищ капитан!",
    "[character] НАДЯ",
    "[dialogue] Слушаюсь!",
    "[character] АНТОН",
    "[dialogue] На чём мы остановились?",
    "[character] ПАПА",
    "[dialogue] Боевые корабли на плече Ориона.",
  ].join("\n"),
  contextBefore: "В комнате-библиотеке разместились ПАПА-пилот (30), АНТОН-Командир (10) и НАДЯ-мичман (3), у которой на коленках сидит собачка Тишка. Звездолет собран из подушек, натянутого покрывала и обувных коробок. На головах хоккейные шлемы, доспехи вырезаны из картона и украшены фломастерами. Папа и Антон вооружены фломастерами и рисуют на больших листах комиксы.",
  contextAfter: "Наш корабль влетает внутрь дредноута, в взлетный отсек. Корабль зависает в воздухе, у него открывается задний шлюз.",
  characterInfo: "Антон — мальчик 10 лет, командир в воображаемой космической игре, серьёзный и увлечённый. Надя — его сестра, 3 года, мичман, непосредственная и весёлая. Папа — отец, 30 лет, пилот, добродушный и творческий.",
};

const LONG_DIALOGUE: DialogueTest = {
  label: "Диалог 2 — Длинный (битва + интеркаты, 30 блоков)",
  description: "Сцены 10–14: Антон на мостике Бездны, параллельно семья обсуждает оружие злодея — юмор и экшн",
  blocksText: [
    // Scene 10 — Bridge
    "[character] АНТОН",
    "[dialogue] Именем Космической Федерации, ты арестован!",
    "[character] КАПИТАН БЕЗДНА",
    "[dialogue] Ты опоздал, Землянин!",
    "[character] КАПИТАН БЕЗДНА",
    "[dialogue] Сейчас ты отправишься в бездну забвения!",
    // Scene 11 — Apartment
    "[character] ПАПА",
    "[dialogue] Погоди, могучее оружие в виде перчатки?",
    "[character] НАДЯ",
    "[dialogue] Как глупо!",
    "[character] АНТОН",
    "[dialogue] Ну да, ерунда какая-то! А как он выглядит? Может шар?",
    // Scene 12 — Bridge
    "[character] ПАПА",
    "[dialogue] Нет, он как гадалка. Пусть будет скипетр",
    "[character] АНТОН",
    "[dialogue] Людовик шестнадцатый",
    "[character] НАДЯ",
    "[dialogue] Мороженое!",
    // Scene 13 — Apartment
    "[character] НАДЯ",
    "[dialogue] Нет! Нет! Придумала!",
    "[character] НАДЯ",
    "[dialogue] Вот!",
    "[character] ПАПА",
    "[dialogue] Все равно это менее глупо чем мега перчатка.",
    // Scene 14 — Bridge
    "[character] АНТОН",
    "[dialogue] Бездна, остановись! Ты погубишь галактику!",
    "[character] КАПИТАН БЕЗДНА",
    "[dialogue] Ну и что?! Недаром же меня называют потрошителем миров!",
    "[character] КАПИТАН БЕЗДНА",
    "[dialogue] Только не это! Земная собака! Вы же знаете, что у меня аллергия! Я погибнуууу!",
  ].join("\n"),
  contextBefore: "Антон, направляет свой ранец к пролому, попутно отбиваясь от киборгов. Наконец он влетает на капитанский мостик. Антон уничтожает последнего киборга. Бездна зловеще смеется. Он встаёт из своего трона, угрожающе нависает над Антоном.",
  contextAfter: "ГОЛОС ПАПЫ\nИ Капитан Бездна активирует гиперболоид, миры снова смешиваются и все переносятся…",
  characterInfo: "Антон — мальчик 10 лет, командир, храбрый и решительный. Капитан Бездна — злодей (285 лет), огромный космический пират с лицом-чёрной дырой, боится собак. Надя — сестра Антона, 3 года, непосредственная, придумывает неожиданные решения. Папа — отец, 30 лет, участвует в игре как пилот, направляет сюжет.",
};

const ALL_DIALOGUES = [SHORT_DIALOGUE, LONG_DIALOGUE];

// ════════════════════════════════════════════
// Result type & runner
// ════════════════════════════════════════════

interface BenchResult {
  model: string; provider: string; status: "OK" | "ERROR";
  tokensIn: number; tokensOut: number; durationMs: number;
  responseText: string; error?: string;
}

async function runDialoguePass(modelDef: ModelDef, dialogue: DialogueTest): Promise<BenchResult> {
  const start = Date.now();
  try {
    const apiKey = getApiKey(modelDef.provider);
    const systemPrompt = composePrompt(modelDef.provider, "dialogue-pass", {
      USER_LANGUAGE: "ru",
    });

    const userPrompt = [
      `Selected dialogue blocks:\n${dialogue.blocksText}`,
      `\nContext before: ${dialogue.contextBefore}`,
      `\nContext after: ${dialogue.contextAfter}`,
      `\nCharacter info: ${dialogue.characterInfo}`,
    ].join("\n");

    const result = await completeAI(
      modelDef.provider,
      systemPrompt,
      userPrompt,
      { apiKey, model: modelDef.id },
      { jsonMode: true },
    );

    return {
      model: modelDef.id, provider: modelDef.provider, status: "OK",
      tokensIn: result.usage.tokensIn, tokensOut: result.usage.tokensOut,
      durationMs: Date.now() - start, responseText: result.text,
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
  lines.push("# Dialogue Pass Benchmark Results — Мурзилка");
  lines.push("");
  lines.push(`**Дата:** ${new Date().toISOString().split("T")[0]}`);
  lines.push(`**Моделей:** ${ALL_MODELS.length}`);
  lines.push(`**Диалогов:** ${ALL_DIALOGUES.length}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  let csvIdx = 0;
  for (const dlg of ALL_DIALOGUES) {
    const results = allResults.get(dlg.label);
    if (!results) continue;
    const csvName = csvNames[csvIdx++];

    lines.push(`## ${dlg.label}`);
    lines.push("");
    lines.push(`> ${dlg.description}`);
    lines.push("");

    lines.push("### Входные блоки диалога");
    lines.push("");
    lines.push("```");
    lines.push(dlg.blocksText);
    lines.push("```");
    lines.push("");
    lines.push(`**Контекст до:** ${dlg.contextBefore.slice(0, 300)}...`);
    lines.push("");
    lines.push(`**Персонажи:** ${dlg.characterInfo}`);
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
  console.log("║   Dialogue Pass Benchmark — Мурзилка × All Models    ║");
  console.log("╚═══════════════════════════════════════════════════════╝");
  console.log(`Models: ${ALL_MODELS.length} | Dialogues: 2 | Total: ${ALL_MODELS.length * 2} calls\n`);

  const allResults = new Map<string, BenchResult[]>();
  const csvNames: string[] = [];
  let totalCalls = 0, totalErrors = 0;
  const globalStart = Date.now();

  for (let di = 0; di < ALL_DIALOGUES.length; di++) {
    const dlg = ALL_DIALOGUES[di];
    const csvName = `dialogue_text${di + 1}.csv`;
    csvNames.push(csvName);

    console.log(`\n━━━ ${dlg.label} ━━━`);
    const results: BenchResult[] = [];

    for (const model of ALL_MODELS) {
      process.stdout.write(`  ${model.id.padEnd(40)} `);
      const result = await runDialoguePass(model, dlg);
      results.push(result);
      totalCalls++;

      if (result.status === "OK") {
        console.log(`OK  ${(result.durationMs / 1000).toFixed(1)}s  in:${result.tokensIn} out:${result.tokensOut}`);
      } else {
        totalErrors++;
        console.log(`ERR ${result.error?.slice(0, 100)}`);
      }
    }

    allResults.set(dlg.label, results);
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
