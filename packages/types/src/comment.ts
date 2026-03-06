import { z } from "zod";

export const createCommentThreadSchema = z.object({
  documentId: z.string(),
  anchorFrom: z.number().int().min(0).max(10_000_000),
  anchorTo: z.number().int().min(0).max(10_000_000),
  content: z.string().min(1).max(10000),
});

export type CreateCommentThreadInput = z.infer<
  typeof createCommentThreadSchema
>;

export const createCommentMessageSchema = z.object({
  threadId: z.string(),
  content: z.string().min(1).max(10000),
});

export type CreateCommentMessageInput = z.infer<
  typeof createCommentMessageSchema
>;
