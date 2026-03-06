import { z } from "zod";

/**
 * TipTap JSONContent schema — validates the recursive document structure.
 * Permissive enough to allow all node types, but ensures correct shape.
 */
const tipTapMarkSchema = z.object({
  type: z.string(),
  attrs: z.record(z.unknown()).optional(),
});

const baseTipTapNodeSchema = z.object({
  type: z.string().optional(),
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
