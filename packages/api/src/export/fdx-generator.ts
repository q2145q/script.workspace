import {
  parseContent,
  type ScreenplayBlock,
  type ScreenplayMetadata,
} from "./content-parser";
import type { ExportOptions } from "@script/types";

const FDX_TYPES: Record<string, string> = {
  sceneHeading: "Scene Heading",
  action: "Action",
  character: "Character",
  dialogue: "Dialogue",
  parenthetical: "Parenthetical",
  transition: "Transition",
  shot: "Shot",
  paragraph: "Action",
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function blockToXml(block: ScreenplayBlock, options: ExportOptions): string {
  const fdxType = FDX_TYPES[block.type] ?? "Action";

  let text = block.text;
  if (
    block.type === "sceneHeading" ||
    block.type === "character" ||
    block.type === "transition" ||
    block.type === "shot"
  ) {
    text = text.toUpperCase();
  }

  // Scene numbering
  let sceneAttr = "";
  if (block.type === "sceneHeading" && options.sceneNumbering && block.sceneNumber) {
    sceneAttr = ` Number="${block.sceneNumber}"`;
  }

  // Build inline text runs with formatting
  const textElements = block.segments
    .map((seg) => {
      let segText = seg.text;
      if (
        block.type === "sceneHeading" ||
        block.type === "character" ||
        block.type === "transition" ||
        block.type === "shot"
      ) {
        segText = segText.toUpperCase();
      }

      const styles: string[] = [];
      if (seg.bold) styles.push("Bold");
      if (seg.italic) styles.push("Italic");

      const styleAttr = styles.length > 0 ? ` Style="${styles.join("+")}"` : "";
      return `      <Text${styleAttr}>${escapeXml(segText)}</Text>`;
    })
    .join("\n");

  return `    <Paragraph Type="${fdxType}"${sceneAttr}>\n${textElements}\n    </Paragraph>`;
}

export async function generateFDX(
  content: Record<string, unknown>,
  options: ExportOptions,
  metadata: ScreenplayMetadata
): Promise<Buffer> {
  const blocks = parseContent(content);

  const titlePageXml = options.titlePage
    ? `  <TitlePage>
    <Content>
      <Paragraph Type="Title">
        <Text>${escapeXml(metadata.title.toUpperCase())}</Text>
      </Paragraph>
      <Paragraph Type="Author">
        <Text>Written by</Text>
      </Paragraph>
${metadata.authors.map((a) => `      <Paragraph Type="Author">\n        <Text>${escapeXml(a)}</Text>\n      </Paragraph>`).join("\n")}${
        metadata.contact
          ? `\n      <Paragraph Type="Contact">\n        <Text>${escapeXml(metadata.contact)}</Text>\n      </Paragraph>`
          : ""
      }${
        metadata.company
          ? `\n      <Paragraph Type="Contact">\n        <Text>${escapeXml(metadata.company)}</Text>\n      </Paragraph>`
          : ""
      }
    </Content>
  </TitlePage>\n`
    : "";

  const paragraphs = blocks.map((b) => blockToXml(b, options)).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="1">
${titlePageXml}  <Content>
${paragraphs}
  </Content>
</FinalDraft>
`;

  return Buffer.from(xml, "utf-8");
}
