import { z } from "zod";

export const sendChatMessageSchema = z.object({
  projectId: z.string(),
  content: z.string().min(1).max(10000),
});
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;

export const listChatMessagesSchema = z.object({
  projectId: z.string(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
export type ListChatMessagesInput = z.infer<typeof listChatMessagesSchema>;

export const clearChatSchema = z.object({
  projectId: z.string(),
});
export type ClearChatInput = z.infer<typeof clearChatSchema>;
