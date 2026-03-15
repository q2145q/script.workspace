import { getEmbedding, toPgVector } from "./embeddings";
import type { ParsedIntent } from "./intent-parser";

/** A scene chunk returned from RAG search */
export interface RAGSearchResult {
  id: string;
  sourceId: string;
  content: string;
  similarity: number;
  metadata: {
    contentHash?: string;
    tags?: {
      characters?: string[];
      location?: string;
      themes?: string[];
      emotion?: string;
      summary?: string;
      timeOfDay?: string;
    };
  } | null;
}

/**
 * Search for relevant scenes using semantic similarity (pgvector cosine distance).
 *
 * @param projectId - Project to search in
 * @param query - User query text
 * @param intent - Parsed intent with entities (optional, enriches search)
 * @param openaiApiKey - OpenAI API key for embedding the query
 * @param prisma - Prisma client instance (passed to avoid circular deps)
 * @param topK - Number of results to return (default 5)
 * @param minSimilarity - Minimum similarity threshold (default 0.7)
 */
export async function searchRelevantScenes(
  projectId: string,
  query: string,
  intent: ParsedIntent | null,
  openaiApiKey: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  topK: number = 5,
  minSimilarity: number = 0.7,
): Promise<RAGSearchResult[]> {
  // Build enriched search text from query + intent entities
  let searchText = query;
  if (intent) {
    const parts: string[] = [query];
    if (intent.entities.characters.length > 0) {
      parts.push(`Characters: ${intent.entities.characters.join(", ")}`);
    }
    if (intent.entities.themes.length > 0) {
      parts.push(`Themes: ${intent.entities.themes.join(", ")}`);
    }
    if (intent.entities.locations.length > 0) {
      parts.push(`Location: ${intent.entities.locations.join(", ")}`);
    }
    searchText = parts.join("\n");
  }

  // Generate embedding for the search query
  const { embedding } = await getEmbedding(searchText, openaiApiKey);
  const vectorStr = toPgVector(embedding);

  // Cosine similarity search using pgvector
  const results: RAGSearchResult[] = await prisma.$queryRaw`
    SELECT
      id,
      "sourceId",
      content,
      1 - (embedding <=> ${vectorStr}::vector) AS similarity,
      metadata
    FROM rag_chunk
    WHERE "projectId" = ${projectId}
      AND "sourceType" = 'scene'
      AND embedding IS NOT NULL
      AND 1 - (embedding <=> ${vectorStr}::vector) > ${minSimilarity}
    ORDER BY similarity DESC
    LIMIT ${topK}
  `;

  return results.map((r) => ({
    ...r,
    similarity: Number(r.similarity),
    metadata: r.metadata as RAGSearchResult["metadata"],
  }));
}

/**
 * Search for relevant episode summaries (for multi-episode projects).
 */
export async function searchEpisodeSummaries(
  projectId: string,
  query: string,
  openaiApiKey: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  topK: number = 3,
): Promise<RAGSearchResult[]> {
  const { embedding } = await getEmbedding(query, openaiApiKey);
  const vectorStr = toPgVector(embedding);

  const results: RAGSearchResult[] = await prisma.$queryRaw`
    SELECT
      id,
      "sourceId",
      content,
      1 - (embedding <=> ${vectorStr}::vector) AS similarity,
      metadata
    FROM rag_chunk
    WHERE "projectId" = ${projectId}
      AND "sourceType" = 'episode_summary'
      AND embedding IS NOT NULL
    ORDER BY similarity DESC
    LIMIT ${topK}
  `;

  return results.map((r) => ({
    ...r,
    similarity: Number(r.similarity),
    metadata: r.metadata as RAGSearchResult["metadata"],
  }));
}
