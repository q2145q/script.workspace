import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  Header,
  PageNumber,
  NumberFormat,
  SectionType,
  convertInchesToTwip,
  Packer,
  PageOrientation,
  type ISectionOptions,
} from "docx";
import {
  parseContent,
  type ScreenplayBlock,
  type ScreenplayMetadata,
} from "./content-parser";
import type { ExportOptions, PaperSize } from "@script/types";

const PAGE_SIZES: Record<PaperSize, { width: number; height: number }> = {
  US_LETTER: {
    width: convertInchesToTwip(8.5),
    height: convertInchesToTwip(11),
  },
  A4: {
    width: convertInchesToTwip(8.27),
    height: convertInchesToTwip(11.69),
  },
};

interface BlockStyle {
  indent: { left: number; right?: number };
  spacing: { before: number; after: number };
  bold: boolean;
  allCaps: boolean;
  italics?: boolean;
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
}

const STYLES: Record<string, BlockStyle> = {
  sceneHeading: {
    indent: { left: convertInchesToTwip(1.5), right: convertInchesToTwip(1) },
    spacing: { before: 240, after: 0 },
    bold: true,
    allCaps: true,
  },
  action: {
    indent: { left: convertInchesToTwip(1.5), right: convertInchesToTwip(1) },
    spacing: { before: 120, after: 0 },
    bold: false,
    allCaps: false,
  },
  character: {
    indent: { left: convertInchesToTwip(3.7) },
    spacing: { before: 120, after: 0 },
    bold: false,
    allCaps: true,
  },
  dialogue: {
    indent: {
      left: convertInchesToTwip(2.5),
      right: convertInchesToTwip(2.5),
    },
    spacing: { before: 0, after: 0 },
    bold: false,
    allCaps: false,
  },
  parenthetical: {
    indent: {
      left: convertInchesToTwip(3.1),
      right: convertInchesToTwip(2.9),
    },
    spacing: { before: 0, after: 0 },
    bold: false,
    allCaps: false,
    italics: true,
  },
  transition: {
    indent: { left: convertInchesToTwip(1.5), right: convertInchesToTwip(1) },
    spacing: { before: 120, after: 0 },
    bold: false,
    allCaps: true,
    alignment: AlignmentType.RIGHT,
  },
  paragraph: {
    indent: { left: convertInchesToTwip(1.5), right: convertInchesToTwip(1) },
    spacing: { before: 120, after: 0 },
    bold: false,
    allCaps: false,
  },
};

export async function generateDOCX(
  content: Record<string, unknown>,
  options: ExportOptions,
  metadata: ScreenplayMetadata
): Promise<Buffer> {
  const blocks = parseContent(content);
  const pageSize = PAGE_SIZES[options.paperSize];

  const sections: ISectionOptions[] = [];

  // Title page section
  if (options.titlePage) {
    sections.push({
      properties: {
        page: {
          size: { ...pageSize, orientation: PageOrientation.PORTRAIT },
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.5),
            right: convertInchesToTwip(1),
          },
        },
      },
      children: buildTitlePage(metadata),
    });
  }

  // Content section
  const contentParagraphs: Paragraph[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const style = STYLES[block.type] ?? STYLES.paragraph;

    let text = block.text;
    if (style.allCaps) text = text.toUpperCase();

    const runs: TextRun[] = [];

    // Scene numbering prefix
    if (
      block.type === "sceneHeading" &&
      options.sceneNumbering &&
      block.sceneNumber
    ) {
      runs.push(
        new TextRun({
          text: `${block.sceneNumber}. `,
          font: "Cousine",
          size: 24,
          bold: true,
        })
      );
    }

    // Build runs from segments for inline formatting
    for (const seg of block.segments) {
      let segText = seg.text;
      if (style.allCaps) segText = segText.toUpperCase();

      runs.push(
        new TextRun({
          text: segText,
          font: "Cousine",
          size: 24, // 12pt in half-points
          bold: style.bold || !!seg.bold,
          italics: !!style.italics || !!seg.italic,
        })
      );
    }

    contentParagraphs.push(
      new Paragraph({
        children: runs,
        indent: style.indent,
        spacing: {
          before: i === 0 ? 0 : style.spacing.before,
          after: style.spacing.after,
          line: 240, // single spacing
        },
        alignment: style.alignment ?? AlignmentType.LEFT,
      })
    );
  }

  const pageNumberHeader = options.pageNumbering
    ? {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  children: [PageNumber.CURRENT, "."],
                  font: "Cousine",
                  size: 24,
                }),
              ],
              indent: { right: convertInchesToTwip(1) },
            }),
          ],
        }),
      }
    : undefined;

  sections.push({
    properties: {
      type: options.titlePage ? SectionType.NEXT_PAGE : undefined,
      page: {
        size: { ...pageSize, orientation: PageOrientation.PORTRAIT },
        margin: {
          top: convertInchesToTwip(1),
          bottom: convertInchesToTwip(1),
          left: convertInchesToTwip(0),
          right: convertInchesToTwip(0),
        },
        pageNumbers: options.pageNumbering
          ? { start: 1, formatType: NumberFormat.DECIMAL }
          : undefined,
      },
    },
    headers: pageNumberHeader,
    children: contentParagraphs,
  });

  const doc = new Document({
    sections,
    styles: {
      default: {
        document: {
          run: {
            font: "Cousine",
            size: 24,
          },
        },
      },
    },
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

function buildTitlePage(metadata: ScreenplayMetadata): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Spacers to push title to ~1/3 down
  for (let i = 0; i < 15; i++) {
    paragraphs.push(new Paragraph({ children: [] }));
  }

  // Title
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: metadata.title.toUpperCase(),
          font: "Cousine",
          size: 48,
          bold: true,
        }),
      ],
    })
  );

  paragraphs.push(new Paragraph({ children: [] }));
  paragraphs.push(new Paragraph({ children: [] }));

  // "Written by"
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Written by",
          font: "Cousine",
          size: 24,
        }),
      ],
    })
  );

  paragraphs.push(new Paragraph({ children: [] }));

  // Author
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: metadata.author,
          font: "Cousine",
          size: 24,
        }),
      ],
    })
  );

  // Spacers for contact info
  for (let i = 0; i < 20; i++) {
    paragraphs.push(new Paragraph({ children: [] }));
  }

  // Contact info
  if (metadata.company) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: metadata.company,
            font: "Cousine",
            size: 24,
          }),
        ],
      })
    );
  }

  if (metadata.contact) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: metadata.contact,
            font: "Cousine",
            size: 24,
          }),
        ],
      })
    );
  }

  return paragraphs;
}
