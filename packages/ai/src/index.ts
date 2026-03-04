export { getProvider, registerProvider } from "./registry";
export { encrypt, decrypt } from "./encryption";
export type {
  AIProvider,
  ProviderId,
  ProviderConfig,
  RewriteInput,
  FormatInput,
  AIRewriteResponse,
  AIFormatResponse,
  FormatBlock,
  PatchOperation,
} from "./types";
export {
  ProviderIdEnum,
  patchOperationSchema,
  aiRewriteResponseSchema,
  aiFormatResponseSchema,
  formatBlockSchema,
} from "./types";

// Chat + Context (Phase 7)
export { buildChatContext, CHAT_SYSTEM_PROMPT } from "./context";
export type { ChatContextInput, ChatContext, ContextLayer } from "./context";
export { streamChatOpenAI, streamChatAnthropic } from "./chat-stream";
export type { ChatStreamInput, StreamCallbacks } from "./chat-stream";
export { extractTextFromTipTapJson } from "./utils";
