import { completeAI } from "./complete";
import { composePrompt } from "./prompts/compose";
import { extractJson } from "./utils";
import { getEmbedding, toPgVector } from "./embeddings";
import type { ProviderConfig } from "./types";

/** Tags extracted by the auto-tagger for a single scene */
export interface SceneTags {
  characters: string[];
  location: string;
  themes: string[];
  emotion: string;
  summary: string;
  timeOfDay: string;
}

/** A parsed scene from TipTap JSON content */
export interface ParsedScene {
  sceneIndex: number;
  heading: string;
  text: string;
  /** md5-like hash to detect changes */
  contentHash: string;
}

/** Result of indexing a single scene */
export interface IndexedScene {
  sceneIndex: number;
  heading: string;
  tags: SceneTags;
  embeddingVector: string; // pgvector-compatible string
}

// ── Parsing TipTap JSON into scenes ─────────────────────────────

/**
 * Parse TipTap JSON document content into individual scenes.
 * Each scene starts with a sceneHeading node and continues until the next heading.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseScenesFromContent(content: any): ParsedScene[] {
  if (!content || !Array.isArray(content.content)) return [];

  const scenes: ParsedScene[] = [];
  let currentHeading = "";
  let currentTextParts: string[] = [];
  let sceneIndex = 0;

  for (const node of content.content) {
    if (node.type === "sceneHeading") {
      // Flush previous scene
      if (currentHeading && currentTextParts.length > 0) {
        const text = currentTextParts.join("\n").trim();
        if (text) {
          scenes.push({
            sceneIndex,
            heading: currentHeading,
            text: `${currentHeading}\n${text}`,
            contentHash: simpleHash(text),
          });
        }
        sceneIndex++;
      }
      currentHeading = extractNodeText(node).trim();
      currentTextParts = [];
    } else {
      const text = extractNodeText(node);
      if (text.trim()) {
        currentTextParts.push(text);
      }
    }
  }

  // Flush last scene
  if (currentHeading && currentTextParts.length > 0) {
    const text = currentTextParts.join("\n").trim();
    if (text) {
      scenes.push({
        sceneIndex,
        heading: currentHeading,
        text: `${currentHeading}\n${text}`,
        contentHash: simpleHash(text),
      });
    }
  }

  return scenes;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractNodeText(node: any): string {
  if (!node) return "";
  if (typeof node.text === "string") return node.text;
  if (Array.isArray(node.content)) {
    return node.content.map(extractNodeText).filter(Boolean).join("\n");
  }
  return "";
}

function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const chr = text.charCodeAt(i);
    hash = ((hash << 5) - hash + chr) | 0;
  }
  return hash.toString(36);
}

// ── Auto-tagging ────────────────────────────────────────────────

/**
 * Tag a scene using GPT-4.1-nano — extracts characters, location, themes, etc.
 */
export async function tagScene(
  sceneText: string,
  config: ProviderConfig,
): Promise<SceneTags> {
  const systemPrompt = composePrompt("openai", "scene-tagger", {
    SCENE_TEXT: sceneText,
  });

  const result = await completeAI("openai", systemPrompt, sceneText, {
    apiKey: config.apiKey,
    model: config.model || "gpt-4.1-nano",
  }, { jsonMode: true });

  const parsed = JSON.parse(extractJson(result.text));

  return {
    characters: Array.isArray(parsed.characters) ? parsed.characters : [],
    location: parsed.location || "",
    themes: Array.isArray(parsed.themes) ? parsed.themes : [],
    emotion: parsed.emotion || "",
    summary: parsed.summary || "",
    timeOfDay: parsed.timeOfDay || "UNKNOWN",
  };
}

// ── Full scene indexing (tag + embed) ───────────────────────────

/**
 * Index a single scene: auto-tag with GPT-4.1-nano, then generate embedding.
 * Returns tags and embedding vector ready for DB storage.
 */
export async function indexScene(
  sceneText: string,
  heading: string,
  taggerConfig: ProviderConfig,
  openaiApiKey: string,
): Promise<{ tags: SceneTags; embeddingVector: string }> {
  // Run tagging and embedding in parallel
  const [tags, embeddingResult] = await Promise.all([
    tagScene(sceneText, taggerConfig),
    (async () => {
      // Build embedding text: heading + summary-like content + characters + themes
      // We'll use the scene text directly for now, then refine after tagging
      const embeddingText = sceneText.slice(0, 8000); // Cap at 8K chars (~2K tokens)
      return getEmbedding(embeddingText, openaiApiKey);
    })(),
  ]);

  // Now that we have tags, create an enriched embedding if the scene was long
  // For short scenes, the initial embedding is good enough
  // For very short scenes, enrich with tag info
  let finalEmbedding = embeddingResult;
  if (sceneText.length < 200) {
    const enrichedText = `${heading}\n${tags.summary}\nCharacters: ${tags.characters.join(", ")}\nThemes: ${tags.themes.join(", ")}`;
    finalEmbedding = await getEmbedding(enrichedText, openaiApiKey);
  }

  return {
    tags,
    embeddingVector: toPgVector(finalEmbedding.embedding),
  };
}

/**
 * Index all changed scenes in a document.
 * Compares content hashes to skip unchanged scenes.
 *
 * @param documentId - The document ID
 * @param projectId - The project ID
 * @param content - TipTap JSON content
 * @param existingHashes - Map of sceneIndex -> contentHash for existing indexed scenes
 * @param taggerConfig - Config for the auto-tagger (GPT-4.1-nano)
 * @param openaiApiKey - OpenAI API key for embeddings
 * @returns Array of scenes that were indexed (changed or new)
 */
export async function indexChangedScenes(
  content: unknown,
  existingHashes: Map<number, string>,
  taggerConfig: ProviderConfig,
  openaiApiKey: string,
): Promise<Array<ParsedScene & { tags: SceneTags; embeddingVector: string }>> {
  const scenes = parseScenesFromContent(content);
  const changedScenes = scenes.filter(
    (s) => existingHashes.get(s.sceneIndex) !== s.contentHash,
  );

  if (changedScenes.length === 0) return [];

  // Index changed scenes in parallel (max 5 concurrent)
  const results: Array<ParsedScene & { tags: SceneTags; embeddingVector: string }> = [];
  const concurrency = 5;

  for (let i = 0; i < changedScenes.length; i += concurrency) {
    const batch = changedScenes.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (scene) => {
        const { tags, embeddingVector } = await indexScene(
          scene.text,
          scene.heading,
          taggerConfig,
          openaiApiKey,
        );
        return { ...scene, tags, embeddingVector };
      }),
    );
    results.push(...batchResults);
  }

  return results;
}
