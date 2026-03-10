#!/usr/bin/env npx tsx
/**
 * Converts benchmark .md results into CSV files.
 * Parses the markdown tables + <details> blocks, generates CSV.
 *
 * Run:
 *   cd packages/ai && npx tsx src/__tests__/convert-to-csv.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AI_DIR = resolve(__dirname, "../../../../AI Instruction");

// ════════════════════════════════════════════
// Parser
// ════════════════════════════════════════════

interface ParsedResult {
  model: string;
  tokensIn: number;
  tokensOut: number;
  time: string;
  stages?: number;
  status: string;
  response: string;
}

interface ParsedSection {
  title: string;
  description: string;
  inputText: string;
  results: ParsedResult[];
}

function parseMarkdownFile(content: string): ParsedSection[] {
  const sections: ParsedSection[] = [];

  // Split by ## headings
  const sectionParts = content.split(/^## /gm).slice(1);

  for (const part of sectionParts) {
    const lines = part.split("\n");
    const title = lines[0].trim();

    // Extract description (> blockquote)
    const descLine = lines.find((l) => l.startsWith("> "));
    const description = descLine?.slice(2).trim() || "";

    // Extract input text (between ``` blocks after "### Входной текст" or "### Запрос")
    let inputText = "";
    const inputHeaderIdx = lines.findIndex(
      (l) => l.includes("### Входной текст") || l.includes("### Запрос"),
    );
    if (inputHeaderIdx >= 0) {
      // Collect everything between the header and "### Результаты"
      const resultsIdx = lines.findIndex(
        (l, i) => i > inputHeaderIdx && l.includes("### Результат"),
      );
      if (resultsIdx > inputHeaderIdx) {
        inputText = lines.slice(inputHeaderIdx, resultsIdx).join("\n").trim();
      }
    }

    // Parse table rows
    const tableStart = lines.findIndex(
      (l) => l.startsWith("| Модель") || l.startsWith("| Model"),
    );
    const results: ParsedResult[] = [];

    if (tableStart >= 0) {
      // Skip header + separator
      for (let i = tableStart + 2; i < lines.length; i++) {
        const line = lines[i];
        if (!line.startsWith("|")) break;

        const cells = line
          .split("|")
          .map((c) => c.trim())
          .filter(Boolean);
        if (cells.length < 5) continue;

        // Detect if there's a "Stages" column (format has it, rewrite doesn't)
        const hasStages = cells.length >= 6;

        results.push({
          model: cells[0],
          tokensIn: parseInt(cells[1]) || 0,
          tokensOut: parseInt(cells[2]) || 0,
          time: cells[3],
          stages: hasStages ? parseInt(cells[4]) || 1 : undefined,
          status: hasStages ? cells[5] : cells[4],
          response: "", // Will be filled from <details> blocks
        });
      }
    }

    // Parse <details> blocks to get full responses
    const detailsRegex =
      /<details><summary><b>([^<]+)<\/b>[^<]*<\/summary>\s*\n\s*```(?:json)?\n([\s\S]*?)```\s*\n\s*<\/details>/g;
    let match;
    while ((match = detailsRegex.exec(part)) !== null) {
      const model = match[1].trim();
      const response = match[2].trim();

      const result = results.find((r) => r.model === model);
      if (result) {
        result.response = response;
      }
    }

    sections.push({ title, description, inputText, results });
  }

  return sections;
}

// ════════════════════════════════════════════
// CSV Generator
// ════════════════════════════════════════════

function escapeCsvField(value: string): string {
  // If value contains comma, newline, or quote, wrap in quotes
  if (
    value.includes(",") ||
    value.includes("\n") ||
    value.includes('"') ||
    value.includes(";")
  ) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function generateCsv(results: ParsedResult[], hasStages: boolean): string {
  const headers = hasStages
    ? ["Модель", "Token In", "Token Out", "Время", "Этапов", "Статус", "Полный ответ модели"]
    : ["Модель", "Token In", "Token Out", "Время", "Статус", "Полный ответ модели"];

  const rows = [headers.join(";")];

  for (const r of results) {
    const fields = hasStages
      ? [
          r.model,
          String(r.tokensIn),
          String(r.tokensOut),
          r.time,
          String(r.stages ?? 1),
          r.status,
          escapeCsvField(r.response || r.status === "ERROR" ? r.response || "ERROR" : ""),
        ]
      : [
          r.model,
          String(r.tokensIn),
          String(r.tokensOut),
          r.time,
          r.status,
          escapeCsvField(r.response || r.status === "ERROR" ? r.response || "ERROR" : ""),
        ];
    rows.push(fields.join(";"));
  }

  return rows.join("\n");
}

// ════════════════════════════════════════════
// Updated Markdown with CSV links
// ════════════════════════════════════════════

function generateUpdatedMd(
  title: string,
  date: string,
  info: string,
  sections: ParsedSection[],
  csvFileNames: string[],
): string {
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`**Дата:** ${date}`);
  lines.push(info);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const csvName = csvFileNames[i];

    lines.push(`## ${section.title}`);
    lines.push("");
    if (section.description) {
      lines.push(`> ${section.description}`);
      lines.push("");
    }

    // Input text
    lines.push(section.inputText);
    lines.push("");

    // Link to CSV
    lines.push(`### Результаты`);
    lines.push("");
    lines.push(`**CSV:** [${csvName}](./${csvName})`);
    lines.push("");

    // Summary table (without full response, that's in CSV)
    const hasStages = section.results.some((r) => r.stages !== undefined);
    if (hasStages) {
      lines.push("| Модель | Token In | Token Out | Время | Этапов | Статус |");
      lines.push("|--------|----------|-----------|-------|--------|--------|");
    } else {
      lines.push("| Модель | Token In | Token Out | Время | Статус |");
      lines.push("|--------|----------|-----------|-------|--------|");
    }

    for (const r of section.results) {
      if (hasStages) {
        lines.push(
          `| ${r.model} | ${r.tokensIn} | ${r.tokensOut} | ${r.time} | ${r.stages ?? 1} | ${r.status} |`,
        );
      } else {
        lines.push(
          `| ${r.model} | ${r.tokensIn} | ${r.tokensOut} | ${r.time} | ${r.status} |`,
        );
      }
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

// ════════════════════════════════════════════
// Process both benchmark files
// ════════════════════════════════════════════

function processFile(
  inputFile: string,
  mdTitle: string,
  csvPrefix: string,
) {
  console.log(`\nProcessing: ${inputFile}`);

  const content = readFileSync(resolve(AI_DIR, inputFile), "utf-8");
  const sections = parseMarkdownFile(content);

  console.log(`  Found ${sections.length} sections`);

  // Extract date and info from header
  const dateMatch = content.match(/\*\*Дата:\*\* (\S+)/);
  const date = dateMatch?.[1] || new Date().toISOString().split("T")[0];

  // Extract extra info lines
  const infoLines = content
    .split("---")[0]
    .split("\n")
    .filter((l) => l.startsWith("**") && !l.includes("Дата"))
    .join("\n");

  const csvFileNames: string[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    // Create safe filename
    const safeName = `${csvPrefix}_text${i + 1}.csv`;
    csvFileNames.push(safeName);

    const hasStages = section.results.some((r) => r.stages !== undefined);
    const csv = generateCsv(section.results, hasStages);

    const csvPath = resolve(AI_DIR, safeName);
    writeFileSync(csvPath, "\uFEFF" + csv, "utf-8"); // BOM for Excel
    console.log(
      `  Saved: ${safeName} (${section.results.length} rows, ${section.results.filter((r) => r.response).length} with responses)`,
    );
  }

  // Generate updated markdown
  const updatedMd = generateUpdatedMd(
    mdTitle,
    date,
    infoLines,
    sections,
    csvFileNames,
  );

  const mdPath = resolve(AI_DIR, inputFile);
  writeFileSync(mdPath, updatedMd, "utf-8");
  console.log(`  Updated: ${inputFile}`);
}

// ════════════════════════════════════════════
// Main
// ════════════════════════════════════════════

try {
  processFile(
    "rewrite_result.md",
    "Rewrite Benchmark Results — Мурзилка",
    "rewrite",
  );
} catch (e: any) {
  console.log(`  Skipping rewrite: ${e.message}`);
}

try {
  processFile(
    "format_result.md",
    "Format Benchmark Results — Мурзилка",
    "format",
  );
} catch (e: any) {
  console.log(`  Skipping format: ${e.message}`);
}

console.log("\nDone!");
