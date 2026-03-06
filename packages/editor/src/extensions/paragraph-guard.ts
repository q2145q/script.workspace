import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const ParagraphGuard = Extension.create({
  name: "paragraphGuard",

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey("paragraphGuard"),
        appendTransaction(transactions, _oldState, newState) {
          // Skip Yjs-originated transactions to prevent infinite loops in collab mode
          if (transactions.some((tr) => tr.getMeta("y-sync$"))) return null;
          if (!transactions.some((tr) => tr.docChanged)) return null;

          const actionType = editor.schema.nodes.action;
          if (!actionType) return null;

          const tr = newState.tr;
          let modified = false;

          newState.doc.descendants((node, pos) => {
            if (node.type.name === "paragraph") {
              tr.setNodeMarkup(pos, actionType, node.attrs);
              modified = true;
            }
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});
