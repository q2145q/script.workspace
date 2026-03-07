import { z } from "zod";

/**
 * Allowed TipTap node and mark types (whitelist).
 * Only these types are accepted when saving document content.
 */
export const ALLOWED_NODE_TYPES = [
  "doc",
  "paragraph",
  "text",
  "hardBreak",
  // Screenplay-specific nodes
  "sceneHeading",
  "action",
  "character",
  "dialogue",
  "parenthetical",
  "transition",
  "shot",
] as const;

export const ALLOWED_MARK_TYPES = [
  "bold",
  "italic",
  "link",
  "comment",
] as const;

const allowedNodeSet = new Set<string>(ALLOWED_NODE_TYPES);
const allowedMarkSet = new Set<string>(ALLOWED_MARK_TYPES);

/**
 * TipTap JSONContent schema — validates the recursive document structure.
 * Uses a whitelist of allowed node and mark types (runtime validation).
 * Types are `string` for TypeScript compat with TipTap JSONContent,
 * but refined at runtime to only allow whitelisted types.
 */
const tipTapMarkSchema = z.object({
  type: z.string().refine((t) => allowedMarkSet.has(t), { message: "Unknown mark type" }),
  attrs: z.record(z.unknown()).optional(),
});

const baseTipTapNodeSchema = z.object({
  type: z.string().refine((t) => allowedNodeSet.has(t), { message: "Unknown node type" }).optional(),
  attrs: z.record(z.unknown()).optional(),
  marks: z.array(tipTapMarkSchema).optional(),
  text: z.string().optional(),
});

type TipTapNode = z.infer<typeof baseTipTapNodeSchema> & {
  content?: TipTapNode[];
};

export const tipTapNodeSchema: z.ZodType<TipTapNode> = baseTipTapNodeSchema.extend({
  content: z.lazy(() => z.array(tipTapNodeSchema)).optional(),
});

/** Schema for TipTap document root — compatible with @tiptap/core JSONContent */
export const tipTapContentSchema = z.object({
  type: z.string().optional(),
  attrs: z.record(z.unknown()).optional(),
  content: z.array(tipTapNodeSchema).optional(),
});

export type TipTapContent = z.infer<typeof tipTapContentSchema>;

/** Permissive schema for document metadata (key-value pairs) */
export const documentMetadataSchema = z.record(z.string(), z.unknown());
