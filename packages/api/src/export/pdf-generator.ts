import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import {
  parseContent,
  type ScreenplayBlock,
  type ScreenplayMetadata,
} from "./content-parser";
import type { ExportOptions, PaperSize } from "@script/types";

// Resolve font directory — try multiple paths for dev/prod compatibility
function findFontDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "../../packages/api/src/export/fonts"),
    path.resolve(process.cwd(), "packages/api/src/export/fonts"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "Cousine-Regular.ttf"))) {
      return dir;
    }
  }
  throw new Error(
    "Cousine fonts not found. Searched: " + candidates.join(", ")
  );
}

// Cache loaded font buffers
let _fonts: {
  regular: Buffer;
  bold: Buffer;
  italic: Buffer;
  boldItalic: Buffer;
} | null = null;

function loadFonts() {
  if (_fonts) return _fonts;
  const dir = findFontDir();
  _fonts = {
    regular: fs.readFileSync(path.join(dir, "Cousine-Regular.ttf")),
    bold: fs.readFileSync(path.join(dir, "Cousine-Bold.ttf")),
    italic: fs.readFileSync(path.join(dir, "Cousine-Italic.ttf")),
    boldItalic: fs.readFileSync(path.join(dir, "Cousine-BoldItalic.ttf")),
  };
  return _fonts;
}

// 72 points = 1 inch
const MARGINS = {
  top: 72,
  bottom: 72,
  left: 108, // 1.5"
  right: 72, // 1"
};

const LEFT_MARGINS: Record<string, number> = {
  sceneHeading: 108,
  action: 108,
  character: 266, // 3.7"
  dialogue: 180, // 2.5"
  parenthetical: 223, // 3.1"
  transition: 108,
  shot: 108,
  paragraph: 108,
};

const RIGHT_MARGINS: Record<string, number> = {
  sceneHeading: 72,
  action: 72,
  character: 72,
  dialogue: 180,
  parenthetical: 209, // 2.9"
  transition: 72,
  shot: 72,
  paragraph: 72,
};

const SPACE_BEFORE: Record<string, number> = {
  sceneHeading: 24,
  action: 12,
  character: 12,
  dialogue: 0,
  parenthetical: 0,
  transition: 12,
  shot: 12,
  paragraph: 12,
};

const PAPER_SIZES: Record<PaperSize, [number, number]> = {
  US_LETTER: [612, 792],
  A4: [595.28, 841.89],
};

export async function generatePDF(
  content: Record<string, unknown>,
  options: ExportOptions,
  metadata: ScreenplayMetadata
): Promise<Buffer> {
  const blocks = parseContent(content);
  const [pageWidth, pageHeight] = PAPER_SIZES[options.paperSize];
  const fonts = loadFonts();

  // Pass Cousine buffer as default font to avoid pdfkit loading Helvetica.
  // pdfkit accepts Buffer at runtime but @types/pdfkit declares font as string.
  const doc = new PDFDocument({
    size: [pageWidth, pageHeight],
    margins: MARGINS,
    bufferPages: true,
    font: fonts.regular as unknown as string,
  });

  // Register named font variants using buffers
  doc.registerFont("Cousine", fonts.regular);
  doc.registerFont("Cousine Bold", fonts.bold);
  doc.registerFont("Cousine Italic", fonts.italic);
  doc.registerFont("Cousine BoldItalic", fonts.boldItalic);

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  // Title page
  if (options.titlePage) {
    renderTitlePage(doc, metadata, pageWidth, pageHeight);
    doc.addPage();
  }

  // Render screenplay blocks
  doc.font("Cousine").fontSize(12);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const leftMargin = LEFT_MARGINS[block.type] ?? MARGINS.left;
    const rightMargin = RIGHT_MARGINS[block.type] ?? MARGINS.right;
    const textWidth = pageWidth - leftMargin - rightMargin;
    const spaceBefore = i === 0 ? 0 : (SPACE_BEFORE[block.type] ?? 12);

    const fontName = getFontForBlock(block);
    doc.font(fontName).fontSize(12);

    let text = block.text;
    if (
      block.type === "sceneHeading" ||
      block.type === "character" ||
      block.type === "transition" ||
      block.type === "shot"
    ) {
      text = text.toUpperCase();
    }

    // Page break check
    const textHeight = doc.heightOfString(text, { width: textWidth });
    if (doc.y + spaceBefore + textHeight > pageHeight - MARGINS.bottom) {
      doc.addPage();
    } else {
      doc.y += spaceBefore;
    }

    // Scene numbering
    if (
      block.type === "sceneHeading" &&
      options.sceneNumbering &&
      block.sceneNumber
    ) {
      const sceneNum = `${block.sceneNumber}.`;
      doc.font("Cousine Bold").fontSize(12);
      doc.text(sceneNum, MARGINS.left - 40, doc.y, {
        width: 34,
        align: "right",
      });
      doc.moveUp();
    }

    // Render text
    doc.font(fontName).fontSize(12);
    doc.text(text, leftMargin, doc.y, {
      width: textWidth,
      align: block.type === "transition" ? "right" : "left",
    });
  }

  // Watermark (on all pages)
  if (options.watermark.enabled && options.watermark.text) {
    const pages = doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      doc.save();
      doc.opacity(0.08);
      doc.font("Cousine Bold").fontSize(60);
      doc.translate(pageWidth / 2, pageHeight / 2);
      doc.rotate(-45, { origin: [0, 0] });
      doc.text(options.watermark.text, -200, -30, {
        width: 400,
        align: "center",
      });
      doc.restore();
    }
  }

  // Page numbers (skip title page)
  if (options.pageNumbering) {
    const pages = doc.bufferedPageRange();
    const startPage = options.titlePage ? 1 : 0;
    for (let i = startPage; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      const pageNum = options.titlePage ? i : i + 1;
      doc.font("Cousine").fontSize(12);
      doc.text(
        `${pageNum}.`,
        pageWidth - MARGINS.right - 40,
        MARGINS.top / 2 - 6,
        { width: 40, align: "right" }
      );
    }
  }

  doc.end();

  return new Promise<Buffer>((resolve) => {
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

function getFontForBlock(block: ScreenplayBlock): string {
  if (block.type === "sceneHeading" || block.type === "shot") return "Cousine Bold";
  if (block.type === "parenthetical") return "Cousine Italic";

  const hasBold = block.segments.some((s) => s.bold);
  const hasItalic = block.segments.some((s) => s.italic);
  if (hasBold && hasItalic) return "Cousine BoldItalic";
  if (hasBold) return "Cousine Bold";
  if (hasItalic) return "Cousine Italic";
  return "Cousine";
}

function renderTitlePage(
  doc: PDFKit.PDFDocument,
  metadata: ScreenplayMetadata,
  pageWidth: number,
  pageHeight: number
) {
  const contentWidth = pageWidth - MARGINS.left - MARGINS.right;

  doc.font("Cousine Bold").fontSize(24);
  doc.text(metadata.title.toUpperCase(), MARGINS.left, pageHeight * 0.35, {
    width: contentWidth,
    align: "center",
  });

  doc.moveDown(2);
  doc.font("Cousine").fontSize(12);
  doc.text("Written by", { width: contentWidth, align: "center" });

  doc.moveDown(1);
  doc.text(metadata.author, { width: contentWidth, align: "center" });

  if (metadata.contact || metadata.company) {
    let contactY = pageHeight - MARGINS.bottom - 60;
    doc.font("Cousine").fontSize(12);
    if (metadata.company) {
      doc.text(metadata.company, MARGINS.left, contactY);
      contactY += 14;
    }
    if (metadata.contact) {
      doc.text(metadata.contact, MARGINS.left, contactY);
    }
  }
}
