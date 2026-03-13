import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = join(__dirname, "..", "prisma", "seed", "demo");

function loadJson<T>(filename: string): T {
  const raw = readFileSync(join(SEED_DIR, filename), "utf-8");
  return JSON.parse(raw) as T;
}

/** Full screenplay in TipTap JSON format */
export function loadInceptionContent(): Record<string, unknown> {
  return loadJson("inception-content.json");
}

/** Character list with names, descriptions, traits */
export function loadInceptionCharacters(): Array<{
  name: string;
  description: string;
  traits: string[];
}> {
  return loadJson("inception-characters.json");
}

/** Location list with names and descriptions */
export function loadInceptionLocations(): Array<{
  name: string;
  description: string;
}> {
  return loadJson("inception-locations.json");
}

/** All pre-computed analysis results keyed by type */
export function loadInceptionAnalyses(): Record<string, unknown> {
  return {
    beat_sheet: loadJson("inception-beat-sheet.json"),
    structure: loadJson("inception-structure.json"),
    pacing: loadJson("inception-pacing.json"),
    consistency: loadJson("inception-consistency.json"),
    knowledge_graph: loadJson("inception-knowledge-graph.json"),
    synopsis: loadJson("inception-synopsis.json"),
    character_analysis: loadJson("inception-character-analysis.json"),
  };
}
