import type { ProviderId, ProviderConfig, StreamUsageResult } from "./types";
import type { Chunk } from "./chunker";
import { chunkByScenes } from "./chunker";
import { completeAI } from "./complete";
import { composePrompt } from "./prompts/compose";
import { getEffectiveLimit } from "./context-limits";
import { estimateTokens } from "./utils";

/** Progress callback for tracking map-reduce status */
export type MapReduceProgressFn = (current: number, total: number, phase: "map" | "reduce") => void;

export interface MapReduceOptions {
  providerId: ProviderId;
  config: ProviderConfig;
  /** Task name for prompt lookup, e.g. "synopsis" */
  taskName: string;
  /** Full text to process */
  fullText: string;
  /** Template variables to pass to prompts (besides CHUNK_TEXT / MAP_RESULTS) */
  variables?: Record<string, string>;
  /** Max concurrent MAP calls */
  concurrency?: number;
  /** Progress callback */
  onProgress?: MapReduceProgressFn;
  /** Abort signal */
  signal?: AbortSignal;
}

export interface MapReduceResult {
  text: string;
  usage: StreamUsageResult;
}

/**
 * Determine whether full text needs map-reduce for a given provider.
 */
export function needsMapReduce(
  fullText: string,
  providerId: ProviderId,
  model?: string,
): boolean {
  const limit = getEffectiveLimit(providerId, model);
  const tokens = estimateTokens(fullText);
  return tokens > limit;
}

/**
 * Run a map-reduce pipeline:
 * 1. Split text into chunks
 * 2. MAP: Process each chunk with "{taskName}-map" prompt
 * 3. REDUCE: Combine MAP results with "{taskName}-reduce" prompt (or "{taskName}" if no reduce)
 *
 * If combined MAP results still exceed context, recursively reduce.
 */
export async function mapReduce(opts: MapReduceOptions): Promise<MapReduceResult> {
  const {
    providerId,
    config,
    taskName,
    fullText,
    variables = {},
    concurrency = 3,
    onProgress,
    signal,
  } = opts;

  // 1. Chunk the text
  const chunks = chunkByScenes(fullText);
  if (chunks.length === 0) {
    throw new Error("No content to process");
  }

  // If only 1 chunk, no need for map-reduce — just call directly
  if (chunks.length === 1) {
    const systemPrompt = composePrompt(providerId, taskName, {
      ...variables,
      SCREENPLAY_TEXT: chunks[0].text,
    });
    const result = await completeAI(providerId, systemPrompt, chunks[0].text, config);
    return { text: result.text, usage: result.usage };
  }

  // 2. MAP phase
  onProgress?.(0, chunks.length, "map");
  const mapResults = await runMapPhase(chunks, providerId, config, taskName, variables, concurrency, onProgress, signal);

  // 3. REDUCE phase
  return runReducePhase(mapResults, providerId, config, taskName, variables, onProgress, signal);
}

async function runMapPhase(
  chunks: Chunk[],
  providerId: ProviderId,
  config: ProviderConfig,
  taskName: string,
  variables: Record<string, string>,
  concurrency: number,
  onProgress?: MapReduceProgressFn,
  signal?: AbortSignal,
): Promise<{ texts: string[]; totalUsage: StreamUsageResult }> {
  const results: string[] = new Array(chunks.length);
  let completed = 0;
  const totalUsage: StreamUsageResult = { tokensIn: 0, tokensOut: 0, durationMs: 0 };

  // Process in batches of `concurrency`
  for (let i = 0; i < chunks.length; i += concurrency) {
    if (signal?.aborted) throw new Error("Aborted");

    const batch = chunks.slice(i, i + concurrency);
    const promises = batch.map(async (chunk) => {
      const mapPrompt = composePrompt(providerId, `${taskName}-map`, {
        ...variables,
        CHUNK_TEXT: chunk.text,
        CHUNK_RANGE: chunk.sceneRange,
      });

      const result = await completeAI(providerId, mapPrompt, chunk.text, config);
      return { index: chunk.index, text: result.text, usage: result.usage };
    });

    const batchResults = await Promise.all(promises);
    for (const r of batchResults) {
      results[r.index] = r.text;
      totalUsage.tokensIn += r.usage.tokensIn;
      totalUsage.tokensOut += r.usage.tokensOut;
      totalUsage.durationMs += r.usage.durationMs;
      completed++;
      onProgress?.(completed, chunks.length, "map");
    }
  }

  return { texts: results, totalUsage };
}

async function runReducePhase(
  mapResults: { texts: string[]; totalUsage: StreamUsageResult },
  providerId: ProviderId,
  config: ProviderConfig,
  taskName: string,
  variables: Record<string, string>,
  onProgress?: MapReduceProgressFn,
  signal?: AbortSignal,
): Promise<MapReduceResult> {
  if (signal?.aborted) throw new Error("Aborted");

  const combined = mapResults.texts
    .map((text, i) => `--- Part ${i + 1} ---\n${text}`)
    .join("\n\n");

  // Check if combined results fit in context
  const limit = getEffectiveLimit(providerId, config.model);
  const combinedTokens = estimateTokens(combined);

  if (combinedTokens > limit) {
    // Recursive reduce: chunk the MAP results and reduce again
    const subChunks = chunkMapResults(mapResults.texts);
    const subResults: string[] = [];
    const subUsage: StreamUsageResult = { ...mapResults.totalUsage };

    for (let i = 0; i < subChunks.length; i++) {
      if (signal?.aborted) throw new Error("Aborted");
      onProgress?.(i, subChunks.length, "reduce");

      const reducePrompt = composePrompt(providerId, `${taskName}-reduce`, {
        ...variables,
        MAP_RESULTS: subChunks[i],
      });

      const result = await completeAI(providerId, reducePrompt, subChunks[i], config);
      subResults.push(result.text);
      subUsage.tokensIn += result.usage.tokensIn;
      subUsage.tokensOut += result.usage.tokensOut;
      subUsage.durationMs += result.usage.durationMs;
    }

    // If we still have multiple sub-results, do a final reduce
    if (subResults.length > 1) {
      return runReducePhase(
        { texts: subResults, totalUsage: subUsage },
        providerId, config, taskName, variables, onProgress, signal,
      );
    }

    return { text: subResults[0], usage: subUsage };
  }

  // Single final reduce call
  onProgress?.(0, 1, "reduce");

  const reducePrompt = composePrompt(providerId, `${taskName}-reduce`, {
    ...variables,
    MAP_RESULTS: combined,
  });

  const result = await completeAI(providerId, reducePrompt, combined, config);

  const totalUsage: StreamUsageResult = {
    tokensIn: mapResults.totalUsage.tokensIn + result.usage.tokensIn,
    tokensOut: mapResults.totalUsage.tokensOut + result.usage.tokensOut,
    durationMs: mapResults.totalUsage.durationMs + result.usage.durationMs,
  };

  onProgress?.(1, 1, "reduce");

  return { text: result.text, usage: totalUsage };
}

/** Split MAP result texts into groups that fit in context */
function chunkMapResults(texts: string[]): string[] {
  const MAX_RESULT_CHARS = 50_000; // ~12.5K tokens
  const chunks: string[] = [];
  let current = "";

  for (let i = 0; i < texts.length; i++) {
    const entry = `--- Part ${i + 1} ---\n${texts[i]}`;
    if (current && current.length + entry.length + 2 > MAX_RESULT_CHARS) {
      chunks.push(current);
      current = "";
    }
    current += (current ? "\n\n" : "") + entry;
  }

  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [texts.join("\n\n")];
}
