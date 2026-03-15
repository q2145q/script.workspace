import { prisma } from "@script/db";
import { decrypt, parseScenesFromContent, indexChangedScenes } from "@script/ai";
import type { SceneTags } from "@script/ai";
import { logger } from "./logger";

/**
 * Run scene indexing in the background after a document save.
 * This function should be called WITHOUT await to avoid blocking the save.
 *
 * Steps:
 * 1. Parse scenes from TipTap content
 * 2. Compare content hashes with existing RAG chunks
 * 3. For changed scenes: auto-tag (GPT-4.1-nano) + generate embedding
 * 4. Upsert RAG chunks and update SceneMetadata tags
 */
export async function triggerSceneIndexing(
  documentId: string,
  projectId: string,
  content: unknown,
): Promise<void> {
  try {
    // 1. Resolve OpenAI API key (needed for both tagger and embeddings)
    const secret = process.env.AI_ENCRYPTION_SECRET;
    if (!secret) {
      logger.warn("AI_ENCRYPTION_SECRET not set, skipping RAG indexing");
      return;
    }

    const globalKey = await prisma.globalApiKey.findFirst({
      where: { provider: "openai", isActive: true },
    });
    if (!globalKey) {
      logger.warn("No active OpenAI key found, skipping RAG indexing");
      return;
    }

    const apiKey = decrypt(globalKey.apiKeyEnc, secret);

    // 2. Get existing content hashes for this document's scenes
    const existingChunks = await prisma.rAGChunk.findMany({
      where: {
        projectId,
        sourceType: "scene",
        sourceId: { startsWith: `${documentId}:` },
      },
      select: { sourceId: true, metadata: true },
    });

    const existingHashes = new Map<number, string>();
    for (const chunk of existingChunks) {
      const sceneIndex = parseInt(chunk.sourceId.split(":")[1], 10);
      const meta = chunk.metadata as Record<string, unknown> | null;
      if (!isNaN(sceneIndex) && meta?.contentHash) {
        existingHashes.set(sceneIndex, meta.contentHash as string);
      }
    }

    // 3. Index changed scenes
    const taggerConfig = { apiKey, model: "gpt-4.1-nano" };
    const changedScenes = await indexChangedScenes(
      content,
      existingHashes,
      taggerConfig,
      apiKey,
    );

    if (changedScenes.length === 0) {
      logger.debug({ documentId }, "RAG indexing: no scenes changed");
      return;
    }

    logger.info(
      { documentId, changedCount: changedScenes.length },
      "RAG indexing: updating changed scenes",
    );

    // 4. Upsert RAG chunks and SceneMetadata tags
    for (const scene of changedScenes) {
      const sourceId = `${documentId}:${scene.sceneIndex}`;

      // Upsert RAG chunk using raw SQL (Prisma can't handle vector type directly)
      await prisma.$executeRaw`
        INSERT INTO rag_chunk (id, "projectId", "sourceType", "sourceId", content, embedding, metadata, "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid()::text,
          ${projectId},
          'scene',
          ${sourceId},
          ${scene.text},
          ${scene.embeddingVector}::vector,
          ${JSON.stringify({ contentHash: scene.contentHash, tags: scene.tags })}::jsonb,
          NOW(),
          NOW()
        )
        ON CONFLICT ("projectId", "sourceType", "sourceId")
        DO UPDATE SET
          content = EXCLUDED.content,
          embedding = EXCLUDED.embedding,
          metadata = EXCLUDED.metadata,
          "updatedAt" = NOW()
      `;

      // Update SceneMetadata tags
      await prisma.sceneMetadata.updateMany({
        where: {
          documentId,
          sceneIndex: scene.sceneIndex,
        },
        data: {
          tags: scene.tags as object,
        },
      });
    }

    // 5. Remove RAG chunks for scenes that no longer exist
    const currentScenes = parseScenesFromContent(content);
    const currentSourceIds = new Set(
      currentScenes.map((s) => `${documentId}:${s.sceneIndex}`),
    );
    const staleChunks = existingChunks.filter(
      (c) => !currentSourceIds.has(c.sourceId),
    );
    if (staleChunks.length > 0) {
      await prisma.rAGChunk.deleteMany({
        where: {
          projectId,
          sourceType: "scene",
          sourceId: { in: staleChunks.map((c) => c.sourceId) },
        },
      });
    }

    logger.info(
      { documentId, indexed: changedScenes.length, removed: staleChunks.length },
      "RAG indexing complete",
    );
  } catch (error) {
    // Never let indexing errors propagate — this runs in background
    logger.error({ err: error, documentId }, "RAG indexing failed");
  }
}
