import { z } from "zod";

export const PaperSizeEnum = z.enum(["US_LETTER", "A4"]);
export type PaperSize = z.infer<typeof PaperSizeEnum>;

export const exportOptionsSchema = z.object({
  documentId: z.string(),
  format: z.enum(["pdf", "docx", "fdx"]),
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

/** Custom title page data stored on the project */
export const titlePageSchema = z.object({
  title: z.string().max(200).default(""),
  subtitle: z.string().max(200).default(""),
  authors: z.array(z.string().max(100)).max(10).default([]),
  contact: z.string().max(500).default(""),
  company: z.string().max(200).default(""),
  draftDate: z.string().max(50).default(""),
  notes: z.string().max(500).default(""),
});
export type TitlePageData = z.infer<typeof titlePageSchema>;
