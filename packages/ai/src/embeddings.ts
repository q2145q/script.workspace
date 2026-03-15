import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 100;

export interface EmbeddingResult {
  embeddings: number[][];
  tokensUsed: number;
}

/**
 * Generate embeddings for one or more texts using OpenAI text-embedding-3-small.
 * Batches requests if more than MAX_BATCH_SIZE inputs.
 */
export async function getEmbeddings(
  texts: string[],
  apiKey: string,
): Promise<EmbeddingResult> {
  if (texts.length === 0) {
    return { embeddings: [], tokensUsed: 0 };
  }

  const client = new OpenAI({ apiKey });
  const allEmbeddings: number[][] = [];
  let totalTokens = 0;

  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    for (const item of response.data) {
      allEmbeddings.push(item.embedding);
    }
    totalTokens += response.usage.total_tokens;
  }

  return { embeddings: allEmbeddings, tokensUsed: totalTokens };
}

/**
 * Generate a single embedding vector for a text string.
 */
export async function getEmbedding(
  text: string,
  apiKey: string,
): Promise<{ embedding: number[]; tokensUsed: number }> {
  const result = await getEmbeddings([text], apiKey);
  return { embedding: result.embeddings[0], tokensUsed: result.tokensUsed };
}

/** Format embedding array as pgvector-compatible string: [0.1,0.2,...] */
export function toPgVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
