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
