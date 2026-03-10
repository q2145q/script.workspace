#!/usr/bin/env npx tsx
/**
 * Scores all benchmark CSV responses using gpt-4.1-nano (1-10 scale).
 *
 * Run:
 *   cd packages/ai && npx tsx src/__tests__/score-benchmarks.ts
 *
 * Options:
 *   --file=dialogue_text1.csv   — process single file
 *   --dry                       — parse only, don't call API
 *   --concurrency=5             — parallel API calls (default 5)
 */

import OpenAI from "openai";
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env.test") });

const AI_DIR = resolve(__dirname, "../../../../AI Instruction");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ════════════════════════════════════════════
// CLI args
// ════════════════════════════════════════════

const args = process.argv.slice(2);
const fileArg = args.find((a) => a.startsWith("--file="))?.split("=")[1];
const dryRun = args.includes("--dry");
const concurrency = parseInt(
  args.find((a) => a.startsWith("--concurrency="))?.split("=")[1] || "5",
);

// ════════════════════════════════════════════
// Task descriptions for scoring context
// ════════════════════════════════════════════

const TASK_DESCRIPTIONS: Record<string, string> = {
  dialogue:
    "Improve/rewrite screenplay dialogue while preserving meaning. Output: JSON with blocks (character, parenthetical, dialogue) and explanation.",
  rewrite:
    "Rewrite/improve a screenplay scene. Output: JSON with blocks (sceneHeading, action, character, dialogue, parenthetical) and explanation.",
  format:
    "Classify unformatted screenplay text into correct block types. Output: JSON with blocks where each block has correct type: sceneHeading, action, character, dialogue, parenthetical, transition.",
  logline:
    "Generate a compelling logline (1-3 sentences) for a screenplay — hook, protagonist, conflict, stakes.",
  synopsis:
    "Generate a comprehensive synopsis of the full screenplay — major plot points, character arcs, themes.",
  scene_synopsis:
    "Generate a brief, accurate synopsis of a single screenplay scene — key events, characters, purpose.",
  beat_sheet:
    "Generate a beat sheet: structured breakdown of story beats, turning points, act structure.",
  character_analysis:
    "Analyze screenplay characters: motivations, arcs, relationships, development, inner conflicts.",
  consistency_check:
    "Find continuity errors, plot holes, and inconsistencies in the screenplay text.",
  describe_character:
    "Generate a detailed visual/personality description of a screenplay character.",
  describe_location:
    "Generate a detailed visual description of a screenplay location/setting.",
  pacing_analysis:
    "Analyze screenplay pacing: rhythm, tension curve, scene lengths, momentum, problem areas.",
  structure_analysis:
    "Analyze dramatic structure: acts, turning points, climax, resolution, structural strengths/weaknesses.",
  analysis:
    "Analyze a screenplay scene: summary, function, characters, conflict, stakes, tone, visual elements, problems, suggestions.",
};

/** Files to skip (metrics-only, no text to evaluate) */
const SKIP_PREFIXES = ["knowledge_graph", "act_assignment"];

// ════════════════════════════════════════════
// CSV Parser (handles semicolons, quoted multiline fields)
// ════════════════════════════════════════════

interface CsvData {
  headers: string[];
  rows: string[][];
  delimiter: ";" | ",";
}

function parseCsv(content: string): CsvData {
  // Strip BOM
  content = content.replace(/^\uFEFF/, "");

  // Detect delimiter from first line
  const firstLine = content.split("\n")[0];
  const delimiter: ";" | "," = firstLine.includes(";") ? ";" : ",";

  const result: string[][] = [];
  let field = "";
  let inQuotes = false;
  let currentRow: string[] = [];

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < content.length && content[i + 1] === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(field);
        field = "";
      } else if (ch === "\n") {
        currentRow.push(field);
        field = "";
        if (currentRow.length > 1 || currentRow[0].trim()) {
          result.push(currentRow);
        }
        currentRow = [];
      } else if (ch === "\r") {
        // skip
      } else {
        field += ch;
      }
    }
  }

  // Flush last row
  if (field || currentRow.length > 0) {
    currentRow.push(field);
    if (currentRow.length > 1 || currentRow[0].trim()) {
      result.push(currentRow);
    }
  }

  return {
    headers: result[0] || [],
    rows: result.slice(1),
    delimiter,
  };
}

function escapeCsvField(value: string, delimiter: string): string {
  if (
    value.includes(delimiter) ||
    value.includes("\n") ||
    value.includes('"') ||
    value.includes("\r")
  ) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function serializeCsv(data: CsvData): string {
  const lines = [
    data.headers.map((h) => escapeCsvField(h, data.delimiter)).join(data.delimiter),
  ];
  for (const row of data.rows) {
    lines.push(row.map((f) => escapeCsvField(f, data.delimiter)).join(data.delimiter));
  }
  return "\uFEFF" + lines.join("\n");
}

// ════════════════════════════════════════════
// Scoring via gpt-4.1-nano
// ════════════════════════════════════════════

async function scoreResponse(
  taskType: string,
  response: string,
): Promise<number> {
  const taskDesc = TASK_DESCRIPTIONS[taskType] || taskType;

  // Truncate very long responses (keep first 6000 chars)
  const truncated =
    response.length > 6000 ? response.slice(0, 6000) + "\n...[truncated]" : response;

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-nano",
    temperature: 0.2,
    max_tokens: 5,
    messages: [
      {
        role: "system",
        content: `You are an expert screenplay editor evaluating AI-generated responses for a professional screenplay tool.

The AI was asked to: ${taskDesc}

Rate this response on a scale of 1 to 10:
1-2: Terrible — wrong format, irrelevant, unusable
3-4: Poor — major errors, missing key elements, barely useful
5-6: Acceptable — correct format, reasonable content, some issues
7-8: Good — complete, professional quality, minor issues at most
9: Very good — excellent quality, insightful, well-structured
10: Outstanding — flawless, could not be improved

Respond with ONLY a single integer (1-10). Nothing else.`,
      },
      {
        role: "user",
        content: truncated,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim() || "";
  const score = parseInt(text);
  return score >= 1 && score <= 10 ? score : 0;
}

// ════════════════════════════════════════════
// Concurrency limiter
// ════════════════════════════════════════════

async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIdx = 0;

  async function worker() {
    while (nextIdx < tasks.length) {
      const idx = nextIdx++;
      results[idx] = await tasks[idx]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

// ════════════════════════════════════════════
// Process a single CSV file
// ════════════════════════════════════════════

interface FileResult {
  filename: string;
  scores: { model: string; score: string }[];
  skipped: boolean;
}

async function processFile(filename: string): Promise<FileResult> {
  const filepath = resolve(AI_DIR, filename);
  const content = readFileSync(filepath, "utf-8");

  // Extract task type from filename
  const taskType = filename
    .replace(/_(?:text|scene)\d+\.csv$/, "");

  // Skip metrics-only files
  if (SKIP_PREFIXES.some((p) => taskType.startsWith(p))) {
    console.log(`  ⊘ ${filename} — metrics-only, skipping`);
    return { filename, scores: [], skipped: true };
  }

  const data = parseCsv(content);

  // Find response column
  const responseColIdx = data.headers.findIndex(
    (h) => h === "Полный ответ модели" || h === "Synopsis",
  );

  if (responseColIdx === -1) {
    console.log(`  ⊘ ${filename} — no response column, skipping`);
    return { filename, scores: [], skipped: true };
  }

  // Find status column
  const statusColIdx = data.headers.findIndex(
    (h) => h === "Статус" || h === "Status",
  );

  // Check if already scored (header exists AND has real numeric scores)
  const scoreHeader = "Оценка (gpt-4.1-nano)";
  const existingScoreIdx = data.headers.indexOf(scoreHeader);
  if (existingScoreIdx >= 0) {
    const hasRealScores = data.rows.some(
      (row) => row[existingScoreIdx] && /^\d+$/.test(row[existingScoreIdx].trim()),
    );
    if (hasRealScores) {
      console.log(`  ✓ ${filename} — already scored, skipping`);
      return { filename, scores: [], skipped: true };
    }
    // Remove the empty score column from dry run
    data.headers.splice(existingScoreIdx, 1);
    for (const row of data.rows) {
      row.splice(existingScoreIdx, 1);
    }
  }

  console.log(`  ▶ ${filename}: ${data.rows.length} rows (${data.delimiter}-delimited)`);

  // Add score column header
  data.headers.push(scoreHeader);

  const scores: { model: string; score: string }[] = [];

  if (dryRun) {
    for (const row of data.rows) {
      row.push("—");
      scores.push({ model: row[0], score: "—" });
    }
  } else {
    // Build scoring tasks
    const tasks = data.rows.map((row, i) => async () => {
      const model = row[0];
      const status = statusColIdx >= 0 ? row[statusColIdx] : "OK";
      const response = row[responseColIdx] || "";

      if (status === "ERROR" || !response.trim() || response === "ERROR") {
        row.push("—");
        console.log(`    ${model}: — (${status})`);
        scores[i] = { model, score: "—" };
        return;
      }

      try {
        const score = await scoreResponse(taskType, response);
        const scoreStr = score > 0 ? String(score) : "ERR";
        row.push(scoreStr);
        console.log(`    ${model}: ${scoreStr}/10`);
        scores[i] = { model, score: scoreStr };
      } catch (err: any) {
        row.push("ERR");
        console.log(`    ${model}: ERR — ${err.message?.slice(0, 80)}`);
        scores[i] = { model, score: "ERR" };
      }
    });

    await withConcurrency(tasks, concurrency);
  }

  // Write back
  writeFileSync(filepath, serializeCsv(data), "utf-8");
  console.log(`    ✓ Saved`);

  return { filename, scores, skipped: false };
}

// ════════════════════════════════════════════
// Main
// ════════════════════════════════════════════

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Benchmark Scorer — gpt-4.1-nano (1-10)");
  console.log("═══════════════════════════════════════════\n");

  if (dryRun) console.log("  [DRY RUN — no API calls]\n");

  let files = readdirSync(AI_DIR)
    .filter((f) => f.endsWith(".csv"))
    .sort();

  if (fileArg) {
    files = files.filter((f) => f === fileArg);
    if (files.length === 0) {
      console.error(`File not found: ${fileArg}`);
      process.exit(1);
    }
  }

  console.log(`Found ${files.length} CSV files\n`);

  const allResults: FileResult[] = [];

  for (const file of files) {
    const result = await processFile(file);
    allResults.push(result);
    console.log();
  }

  // ── Summary ──
  console.log("═══════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════\n");

  const processed = allResults.filter((r) => !r.skipped);
  const skipped = allResults.filter((r) => r.skipped);

  console.log(`Processed: ${processed.length} files`);
  console.log(`Skipped:   ${skipped.length} files\n`);

  for (const r of processed) {
    console.log(`${r.filename}:`);
    for (const s of r.scores) {
      console.log(`  ${s.model.padEnd(35)} ${s.score}`);
    }
    console.log();
  }

  console.log("Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
