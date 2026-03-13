/**
 * Parse Inception screenplay raw text into TipTap JSON format.
 *
 * Usage: node scripts/parse-inception.mjs
 *
 * Input:  AI Instruction/inception-raw.txt (pdftotext -layout output)
 * Output: packages/db/prisma/seed/demo/inception-content.json
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const rawText = readFileSync(
  resolve(ROOT, "AI Instruction/inception-raw.txt"),
  "utf-8"
);

const lines = rawText.split("\n");

// ── Patterns ──────────────────────────────────────────────────
const SCENE_HEADING_RE =
  /^(ИНТ\.|НАТ\.|ИНТ\/НАТ\.|ИНТ\.\s*\/\s*НАТ\.|НАТ\.\s*\/\s*ИНТ\.)/;
const TRANSITION_RE = /^[\s]*(СКЛЕЙКА|НАПЛЫВ|ЗАТУХАНИЕ|ТИТРЫ|КОНЕЦ)[:\.]?\s*$/;
const PAGE_NUMBER_RE = /^\s*\d{1,3}\s*$/;
const CHARACTER_RE = /^\s{10,30}([А-ЯЁA-Z][А-ЯЁA-Z\s/.()]{1,50})\s*$/;
const PARENTHETICAL_RE = /^\s{8,20}\(.*\)\s*$/;
const DIALOGUE_RE = /^\s{6,16}\S/;
const CENTERED_EMPTY_RE = /^\s*$/;

// Known character names for better detection
const KNOWN_CHARACTERS = new Set([
  "КОББ",
  "МОЛ",
  "АРТУР",
  "АРИАДНА",
  "ИМС",
  "САЙТО",
  "ЮСУФ",
  "ФИШЕР",
  "БРАУНИНГ",
  "МАЙЛЗ",
  "НЭШ",
  "ОТЕЦ",
  "АДМИНИСТРАТОР",
  "ОХРАННИК",
  "ПОЖИЛОЙ ЯПОНЕЦ",
  "БЛОНДИНКА",
  "СТЮАРДЕССА",
  "ОФИЦИАНТ",
  "ТОДАШИ",
  "ФИЛИППА",
  "ДЖЕЙМС",
]);

/**
 * Determine line type based on indentation and content.
 */
function classifyLine(line, prevType, nextLine) {
  const trimmed = line.trimEnd();
  if (trimmed === "") return "empty";

  // Page numbers (standalone number lines)
  if (PAGE_NUMBER_RE.test(trimmed)) return "page_number";

  // Title page elements (first few lines)
  if (/^\s{10,}НАЧАЛО\s*$/.test(line)) return "skip";
  if (/^\s{5,}Кристофер Нолан\s*$/.test(line)) return "skip";
  if (/^\s*Переведено каналом/.test(line)) return "skip";
  if (/^\s*https?:\/\//.test(line)) return "skip";

  // Scene headings
  if (SCENE_HEADING_RE.test(trimmed)) return "scene_heading";

  // Transitions (right-aligned or specific keywords)
  if (TRANSITION_RE.test(trimmed)) return "transition";

  // Calculate leading spaces
  const leadingSpaces = line.match(/^(\s*)/)?.[1]?.length ?? 0;

  // Character names (centered, ALL CAPS)
  if (leadingSpaces >= 16 && leadingSpaces <= 28) {
    const content = trimmed.trim();
    // Strip common suffixes for matching
    const baseName = content
      .replace(/\s*\(ПРОД\.\)\s*$/, "")
      .replace(/\s*\(ЗК\)\s*$/, "")
      .replace(/\s*\(ПО РАДИО\)\s*$/, "")
      .replace(/\s*\(ПО РАЦИИ\)\s*$/, "")
      .replace(/\s*\(ПРОДОЛЖ\.\)\s*$/, "")
      .trim();

    // Check if known character or if it's all uppercase Cyrillic
    if (KNOWN_CHARACTERS.has(baseName)) return "character";
    if (/^[А-ЯЁ\s/.]+$/.test(baseName) && baseName.length >= 2 && baseName.length <= 30) {
      return "character";
    }
  }

  // Parenthetical (indented, in parentheses)
  if (PARENTHETICAL_RE.test(line)) return "parenthetical";

  // Dialogue (indented 6-16 spaces, follows character or dialogue or parenthetical)
  if (
    leadingSpaces >= 6 &&
    leadingSpaces <= 16 &&
    (prevType === "character" ||
      prevType === "dialogue" ||
      prevType === "parenthetical")
  ) {
    return "dialogue";
  }

  // ВСТАВКА lines (flashback inserts) — treat as action in italic
  if (/^ВСТАВКА:/.test(trimmed)) return "action";

  // Default: action
  return "action";
}

/**
 * Merge continuation lines and build TipTap nodes.
 */
function parseToTiptap(lines) {
  const nodes = [];
  let currentType = null;
  let currentText = "";
  let prevType = "empty";
  let skipTitlePage = true;

  function flush() {
    if (currentType && currentText.trim()) {
      const text = currentText.trim();
      nodes.push(makeNode(currentType, text));
    }
    currentType = null;
    currentText = "";
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : "";

    const type = classifyLine(line, prevType, nextLine);

    // Skip title page until first scene heading
    if (skipTitlePage) {
      if (type === "scene_heading") {
        skipTitlePage = false;
      } else {
        continue;
      }
    }

    if (type === "empty" || type === "page_number" || type === "skip") {
      // Empty lines separate blocks (except within dialogue)
      if (type === "empty" && currentType === "dialogue") {
        // Check if next non-empty line is still dialogue continuation
        // If not, flush
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === "") j++;
        if (j < lines.length) {
          const nextType = classifyLine(lines[j], "dialogue", lines[j + 1] || "");
          if (nextType !== "dialogue") {
            flush();
          }
        }
      } else if (type === "empty") {
        flush();
      }
      continue;
    }

    const trimmedText = line.trim();

    if (type !== currentType) {
      flush();
      currentType = type;
      currentText = trimmedText;
    } else {
      // Continuation of same type
      currentText += " " + trimmedText;
    }

    prevType = type;
  }

  flush();
  return nodes;
}

/**
 * Create a TipTap node from type and text.
 */
function makeNode(type, text) {
  const nodeType = mapToTiptapType(type);

  // For character nodes, normalize the name
  if (type === "character") {
    text = normalizeCharacterName(text);
  }

  return {
    type: nodeType,
    content: [
      {
        type: "text",
        text: text,
      },
    ],
  };
}

function mapToTiptapType(type) {
  switch (type) {
    case "scene_heading":
      return "scene_heading";
    case "action":
      return "action";
    case "character":
      return "character";
    case "dialogue":
      return "dialogue";
    case "parenthetical":
      return "parenthetical";
    case "transition":
      return "transition";
    default:
      return "action";
  }
}

function normalizeCharacterName(name) {
  // Keep (ПРОД.), (ЗК), etc. but normalize spacing
  return name.replace(/\s+/g, " ").trim();
}

// ── Main ──────────────────────────────────────────────────────

const nodes = parseToTiptap(lines);

// Build TipTap document
const tiptapDoc = {
  type: "doc",
  content: nodes,
};

// Stats
const stats = {
  totalNodes: nodes.length,
  byType: {},
};
for (const node of nodes) {
  stats.byType[node.type] = (stats.byType[node.type] || 0) + 1;
}

console.log("Parsing complete!");
console.log("Stats:", JSON.stringify(stats, null, 2));

// Write output
const outputPath = resolve(
  ROOT,
  "packages/db/prisma/seed/demo/inception-content.json"
);
writeFileSync(outputPath, JSON.stringify(tiptapDoc, null, 2), "utf-8");
console.log(`Written to: ${outputPath}`);

// Also write a compact version (no pretty-printing) for smaller file size
const compactPath = resolve(
  ROOT,
  "packages/db/prisma/seed/demo/inception-content.min.json"
);
writeFileSync(compactPath, JSON.stringify(tiptapDoc), "utf-8");
console.log(`Compact version: ${compactPath}`);
