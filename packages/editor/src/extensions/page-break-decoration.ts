import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const pageBreakKey = new PluginKey("pageBreakDecoration");

const LINES_PER_PAGE = 56;

const LINE_WEIGHT: Record<string, number> = {
  sceneHeading: 2,
  action: 1,
  character: 1,
  dialogue: 1,
  parenthetical: 1,
  transition: 2,
  shot: 2,
};

const SPACE_BEFORE: Record<string, number> = {
  sceneHeading: 2,
  action: 1,
  character: 1,
  dialogue: 0,
  parenthetical: 0,
  transition: 1,
  shot: 1,
};

export const PageBreakDecoration = Extension.create({
  name: "pageBreakDecoration",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pageBreakKey,
        state: {
          init(_, state) {
            return buildDecorations(state.doc);
          },
          apply(tr, set) {
            if (!tr.docChanged) return set;
            return buildDecorations(tr.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

function buildDecorations(doc: import("@tiptap/pm/model").Node): DecorationSet {
  const decorations: Decoration[] = [];
  let lineCount = 0;
  let pageNum = 1;
  let nodeIndex = 0;

  doc.forEach((node, offset) => {
    const type = node.type.name;
    const text = node.textContent;
    const spaceBefore = nodeIndex === 0 ? 0 : (SPACE_BEFORE[type] ?? 1);
    const weight = LINE_WEIGHT[type] ?? 1;
    const textLines = Math.max(1, Math.ceil(text.length / 60));
    const totalLines = spaceBefore + textLines * weight;

    if (lineCount + totalLines > LINES_PER_PAGE && lineCount > 0) {
      pageNum++;
      lineCount = 0;

      // Insert page break widget before this node
      const widget = Decoration.widget(offset, () => {
        const el = document.createElement("div");
        el.className = "page-break-indicator";
        el.setAttribute("contenteditable", "false");
        el.textContent = `— ${pageNum} —`;
        return el;
      }, { side: -1 });
      decorations.push(widget);
    }

    lineCount += totalLines;
    nodeIndex++;
  });

  return DecorationSet.create(doc, decorations);
}
