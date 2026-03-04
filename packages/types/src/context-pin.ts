import { z } from "zod";

export const ContextPinTypeEnum = z.enum(["TEXT", "COMMENT", "CUSTOM"]);

export const createPinSchema = z.object({
  projectId: z.string(),
  content: z.string().min(1).max(5000),
  type: ContextPinTypeEnum.default("TEXT"),
  label: z.string().max(100).optional(),
});
export type CreatePinInput = z.infer<typeof createPinSchema>;

export const deletePinSchema = z.object({
  id: z.string(),
});
export type DeletePinInput = z.infer<typeof deletePinSchema>;

export const listPinsSchema = z.object({
  projectId: z.string(),
});
export type ListPinsInput = z.infer<typeof listPinsSchema>;

export const reorderPinsSchema = z.object({
  projectId: z.string(),
  pinIds: z.array(z.string()),
});
export type ReorderPinsInput = z.infer<typeof reorderPinsSchema>;
