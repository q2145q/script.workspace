import type { Node as PmNode } from "@tiptap/pm/model";

// --- Constants ---

export const SCENE_TYPES = [
  "ИНТ.",
  "НАТ.",
  "ИНТ./НАТ.",
  "НАТ./ИНТ.",
  "INT.",
  "EXT.",
  "INT./EXT.",
  "EXT./INT.",
];

export const TIME_OF_DAY = [
  "ДЕНЬ",
  "НОЧЬ",
  "УТРО",
  "ВЕЧЕР",
  "DAY",
  "NIGHT",
  "MORNING",
  "EVENING",
  "DUSK",
  "DAWN",
];

// Regex to match any scene type prefix at the start of text
const SCENE_TYPE_REGEX =
  /^(ИНТ\.\/НАТ\.|НАТ\.\/ИНТ\.|ИНТ\.|НАТ\.|INT\.\/EXT\.|EXT\.\/INT\.|INT\.|EXT\.)\s*/;

// --- Phase detection ---

export type SceneHeadingPhase = "type" | "location" | "subLocation" | "timeOfDay";

export interface SceneHeadingParseResult {
  phase: SceneHeadingPhase;
  /** The portion of text the user is currently typing (for filtering) */
  query: string;
  /** Absolute offset within the node text where replacement should start */
  replaceFrom: number;
  /** The detected scene type prefix, if any */
  sceneType?: string;
  /** The detected location, if any */
  location?: string;
}

/**
 * Parses the current text of a sceneHeading node and determines which phase
 * of the heading the cursor is in.
 *
 * Format: [TYPE] [LOCATION]. [SUB-LOCATION] — [TIME]
 */
export function parseSceneHeadingPhase(
  text: string,
  cursorOffset: number
): SceneHeadingParseResult {
  const textUpToCursor = text.slice(0, cursorOffset);

  // Phase 1: Type — no recognized prefix yet
  const typeMatch = textUpToCursor.match(SCENE_TYPE_REGEX);
  if (!typeMatch) {
    return {
      phase: "type",
      query: textUpToCursor.toUpperCase(),
      replaceFrom: 0,
    };
  }

  const sceneType = typeMatch[1];
  const afterType = textUpToCursor.slice(typeMatch[0].length);

  // Check for time-of-day separator " — " (em-dash or double hyphen)
  const timeSepIdx = afterType.search(/\s[—–-]{1,2}\s/);
  if (timeSepIdx !== -1) {
    const sepMatch = afterType.slice(timeSepIdx).match(/^\s[—–-]{1,2}\s/)!;
    const afterSep = afterType.slice(timeSepIdx + sepMatch[0].length);
    return {
      phase: "timeOfDay",
      query: afterSep.toUpperCase(),
      replaceFrom: typeMatch[0].length + timeSepIdx + sepMatch[0].length,
      sceneType,
    };
  }

  // Check for sub-location: "LOCATION. " (dot + space after the location)
  const dotSpaceIdx = afterType.indexOf(". ");
  if (dotSpaceIdx !== -1) {
    const location = afterType.slice(0, dotSpaceIdx).trim();
    const afterDot = afterType.slice(dotSpaceIdx + 2);
    return {
      phase: "subLocation",
      query: afterDot.toUpperCase(),
      replaceFrom: typeMatch[0].length + dotSpaceIdx + 2,
      sceneType,
      location: location.toUpperCase(),
    };
  }

  // Phase 2: Location — after type prefix
  return {
    phase: "location",
    query: afterType.toUpperCase(),
    replaceFrom: typeMatch[0].length,
    sceneType,
  };
}

// --- Document scanning ---

interface ParsedHeading {
  type: string;
  location: string;
  subLocation?: string;
  timeOfDay?: string;
}

function parseFullSceneHeading(text: string): ParsedHeading | null {
  const match = text.match(SCENE_TYPE_REGEX);
  if (!match) return null;

  const type = match[1];
  const rest = text.slice(match[0].length);

  let location = rest;
  let subLocation: string | undefined;
  let timeOfDay: string | undefined;

  // Extract time of day
  const timeSepIdx = rest.search(/\s[—–-]{1,2}\s/);
  if (timeSepIdx !== -1) {
    const sepMatch = rest.slice(timeSepIdx).match(/^\s[—–-]{1,2}\s/)!;
    timeOfDay = rest.slice(timeSepIdx + sepMatch[0].length).trim();
    location = rest.slice(0, timeSepIdx);
  }

  // Extract sub-location
  const dotIdx = location.indexOf(". ");
  if (dotIdx !== -1) {
    subLocation = location.slice(dotIdx + 2).trim();
    location = location.slice(0, dotIdx);
  }

  location = location.trim();

  return {
    type,
    location: location.toUpperCase(),
    subLocation: subLocation ? subLocation.toUpperCase() : undefined,
    timeOfDay: timeOfDay ? timeOfDay.toUpperCase() : undefined,
  };
}

/**
 * Scans all sceneHeading nodes in the document and returns
 * a map of location → set of sub-locations.
 * Locations are sorted by frequency (most used first).
 */
export function extractLocationsFromDoc(
  doc: PmNode
): Map<string, Set<string>> {
  const locationCount = new Map<string, number>();
  const locationSubs = new Map<string, Set<string>>();

  doc.descendants((node) => {
    if (node.type.name === "sceneHeading") {
      const parsed = parseFullSceneHeading(node.textContent);
      if (parsed && parsed.location) {
        locationCount.set(
          parsed.location,
          (locationCount.get(parsed.location) ?? 0) + 1
        );
        if (!locationSubs.has(parsed.location)) {
          locationSubs.set(parsed.location, new Set());
        }
        if (parsed.subLocation) {
          locationSubs.get(parsed.location)!.add(parsed.subLocation);
        }
      }
    }
  });

  // Sort by frequency descending
  const sorted = new Map<string, Set<string>>();
  const entries = Array.from(locationCount.entries()).sort(
    (a, b) => b[1] - a[1]
  );
  for (const [loc] of entries) {
    sorted.set(loc, locationSubs.get(loc)!);
  }

  return sorted;
}

/**
 * Scans all character nodes and returns unique names
 * sorted by frequency (most used first).
 */
export function extractCharacterNamesFromDoc(doc: PmNode): string[] {
  const counts = new Map<string, number>();

  doc.descendants((node) => {
    if (node.type.name === "character") {
      const name = node.textContent.trim().toUpperCase();
      if (name) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}
