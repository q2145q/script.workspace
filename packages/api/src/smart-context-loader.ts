import { prisma } from "@script/db";
import {
  buildSmartContext,
  extractTextFromTipTapJson,
  searchRelevantScenes,
  searchEpisodeSummaries,
  parseIntent,
  resolveCharacterReferences,
  decrypt,
} from "@script/ai";
import type { SmartContext, SmartContextInput, RAGSearchResult } from "@script/ai";
import { logger } from "./logger";

export interface SmartContextParams {
  projectId: string;
  /** User query or selected text (used for RAG search) */
  query?: string;
  /** Chat history for intent parsing */
  chatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  /** Editor context from client */
  editorContext?: {
    currentSceneText?: string;
    adjacentScenesText?: string;
  };
  /** Skip RAG search (e.g., for simple formatting tasks) */
  skipRAG?: boolean;
}

/**
 * Load full smart context for any AI call.
 * Fetches bible, characters, pins, runs RAG search, assembles context.
 *
 * Returns SmartContext + raw RAG results for additional processing.
 */
export async function loadSmartContext(
  params: SmartContextParams,
): Promise<SmartContext & { ragResults: RAGSearchResult[] }> {
  const { projectId, query, chatHistory, editorContext, skipRAG } = params;

  // Load project data in parallel
  const [bible, characters, pins] = await Promise.all([
    prisma.projectBible.findUnique({
      where: { projectId },
      select: { content: true },
    }),
    prisma.character.findMany({
      where: { projectId },
      select: { name: true, description: true, traits: true },
    }),
    prisma.contextPin.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
      select: { content: true, label: true },
    }),
  ]);

  const bibleText = bible ? extractTextFromTipTapJson(bible.content) : undefined;

  // RAG search (if query provided and not skipped)
  let ragResults: RAGSearchResult[] = [];
  let episodeSummaries: Array<{ content: string }> = [];

  if (query && !skipRAG) {
    try {
      const openaiApiKey = await getOpenAIApiKey();
      if (openaiApiKey) {
        // Parse intent for enriched search
        let intent = null;
        try {
          intent = await parseIntent(
            query,
            chatHistory || [],
            { apiKey: openaiApiKey, model: "gpt-4.1-nano" },
          );

          // Resolve character references
          if (intent.entities.characters.length > 0) {
            const sceneCharacters = await getRecentSceneCharacters(projectId);
            intent.entities.characters = resolveCharacterReferences(
              intent.entities.characters,
              characters.map((c) => c.name),
              sceneCharacters,
            );
          }
        } catch (err) {
          logger.warn({ err }, "Intent parsing failed, proceeding with raw query");
        }

        // Run semantic search + episode summaries in parallel
        const [sceneResults, summaries] = await Promise.all([
          searchRelevantScenes(projectId, query, intent, openaiApiKey, prisma),
          searchEpisodeSummaries(projectId, query, openaiApiKey, prisma),
        ]);

        ragResults = sceneResults;
        episodeSummaries = summaries.map((s) => ({ content: s.content }));
      }
    } catch (err) {
      logger.warn({ err, projectId }, "RAG search failed, proceeding without");
    }
  }

  // Build smart context
  const smartContext = buildSmartContext({
    bibleText: bibleText || undefined,
    characters,
    pins,
    currentSceneText: editorContext?.currentSceneText,
    ragResults,
    adjacentScenesText: editorContext?.adjacentScenesText,
    episodeSummaries: episodeSummaries.length > 0 ? episodeSummaries : undefined,
    chatHistory,
  });

  return { ...smartContext, ragResults };
}

/** Get OpenAI API key for RAG operations (embedding + intent parsing) */
async function getOpenAIApiKey(): Promise<string | null> {
  const secret = process.env.AI_ENCRYPTION_SECRET;
  if (!secret) return null;

  const globalKey = await prisma.globalApiKey.findFirst({
    where: { provider: "openai", isActive: true },
  });
  if (!globalKey) return null;

  return decrypt(globalKey.apiKeyEnc, secret);
}

/** Get character names from recent scene metadata */
async function getRecentSceneCharacters(projectId: string): Promise<string[]> {
  const scenes = await prisma.sceneMetadata.findMany({
    where: {
      document: { projectId, deletedAt: null },
    },
    select: { characters: true },
    take: 50,
  });

  const names = new Set<string>();
  for (const scene of scenes) {
    for (const name of scene.characters) {
      names.add(name);
    }
  }
  return [...names];
}
