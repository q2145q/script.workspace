import { z } from "zod";

export const PaperSizeEnum = z.enum(["US_LETTER", "A4"]);
export type PaperSize = z.infer<typeof PaperSizeEnum>;

export const exportOptionsSchema = z.object({
  documentId: z.string(),
  format: z.enum(["pdf", "docx"]),
  titlePage: z.boolean().default(true),
  sceneNumbering: z.boolean().default(false),
  pageNumbering: z.boolean().default(true),
  paperSize: PaperSizeEnum.default("US_LETTER"),
  watermark: z
    .object({
      enabled: z.boolean().default(false),
      text: z.string().max(100).default(""),
    })
    .default({ enabled: false, text: "" }),
});
export type ExportOptions = z.infer<typeof exportOptionsSchema>;
