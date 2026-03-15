export { getProvider, registerProvider } from "./registry";
export { encrypt, decrypt } from "./encryption";
export type {
  AIProvider,
  AITaskType,
  ProviderId,
  ProviderConfig,
  RewriteInput,
  FormatInput,
  AIRewriteResponse,
  AIFormatResponse,
  FormatBlock,
  PatchOperation,
  StreamUsageResult,
} from "./types";
export {
  ProviderIdEnum,
  patchOperationSchema,
  aiRewriteResponseSchema,
  aiFormatResponseSchema,
  formatBlockSchema,
} from "./types";

// Chat + Context
export { buildChatContext } from "./context";
export type { ChatContextInput, ChatContext, ContextLayer } from "./context";
export { streamChatOpenAI, streamChatAnthropic, streamChatYandex, streamChat } from "./chat-stream";
export type { ChatStreamInput, StreamCallbacks } from "./chat-stream";
export { extractTextFromTipTapJson, extractScreenplayStructure, stripCodeFences, extractJson, estimateTokens, isFixedTemperatureModel } from "./utils";
export { AIProviderError } from "./errors";

// Non-streaming completion (Phase 3)
export { completeAI } from "./complete";
export type { CompleteResult, CompleteOptions } from "./complete";

// Context limits & Map-Reduce
export { getEffectiveLimit, fitsInContext, getContextLimitInfo } from "./context-limits";
export { chunkByScenes } from "./chunker";
export type { Chunk } from "./chunker";
export { mapReduce, needsMapReduce } from "./map-reduce";
export type { MapReduceOptions, MapReduceResult, MapReduceProgressFn } from "./map-reduce";

// Thinking configuration (Phase 4)
export { getThinkingConfig } from "./thinking-config";

// Pricing & cost estimation
export { TOKEN_PRICES, estimateCost, formatCost, formatTokens } from "./pricing";

// Task-specific model configuration
export { TASK_MODEL_CONFIG, getTaskModel, getTaskModels } from "./task-models";
export type { ModelTier, TaskModelEntry } from "./task-models";

// Circuit breaker & provider fallback
export {
  isCircuitOpen,
  recordFailure,
  recordSuccess,
  resetAllCircuits,
  getNextFallback,
  isRetryableError,
  withProviderFallback,
} from "./circuit-breaker";
export type { FallbackKeyResolver } from "./circuit-breaker";

// Embeddings
export { getEmbeddings, getEmbedding, toPgVector } from "./embeddings";
export type { EmbeddingResult } from "./embeddings";

// Scene indexer (RAG)
export {
  parseScenesFromContent,
  tagScene,
  indexScene,
  indexChangedScenes,
} from "./scene-indexer";
export type { SceneTags, ParsedScene, IndexedScene } from "./scene-indexer";

// Intent parser
export { parseIntent, resolveCharacterReferences } from "./intent-parser";
export type { ParsedIntent, ChatHistoryMessage } from "./intent-parser";

// RAG search
export { searchRelevantScenes, searchEpisodeSummaries } from "./rag-search";
export type { RAGSearchResult } from "./rag-search";

// Smart context (RAG-aware context builder)
export { buildSmartContext, MAX_SMART_CONTEXT_CHARS } from "./smart-context";
export type { SmartContextInput, SmartContext } from "./smart-context";

// Prompt system (Phase 1)
export { fillTemplate, composePrompt } from "./prompts/compose";
export type { TemplateVars } from "./prompts/compose";
export { loadTaskPrompt, clearPromptCache } from "./prompts/loader";
export { getSystemPrompt } from "./prompts/system/index";
export {
  OPENAI_SYSTEM_PROMPT,
  ANTHROPIC_SYSTEM_PROMPT,
  DEEPSEEK_SYSTEM_PROMPT,
  GEMINI_SYSTEM_PROMPT,
  YANDEX_SYSTEM_PROMPT,
  GROK_SYSTEM_PROMPT,
} from "./prompts/system/index";
