import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const selectionHighlightKey = new PluginKey("selectionHighlight");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    selectionHighlight: {
      setSelectionHighlight: (range: { from: number; to: number }) => ReturnType;
      clearSelectionHighlight: () => ReturnType;
    };
  }
}

export const SelectionHighlight = Extension.create({
  name: "selectionHighlight",

  addCommands() {
    return {
      setSelectionHighlight:
        (range) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(selectionHighlightKey, { from: range.from, to: range.to });
          }
          return true;
        },
      clearSelectionHighlight:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(selectionHighlightKey, null);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: selectionHighlightKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, set) {
            const meta = tr.getMeta(selectionHighlightKey);
            // Explicit set/clear
            if (meta !== undefined) {
              if (meta === null) return DecorationSet.empty;
              const { from, to } = meta;
              const deco = Decoration.inline(from, to, {
                class: "comment-pending-highlight",
              });
              return DecorationSet.create(tr.doc, [deco]);
            }
            // Map through doc changes
            return set.map(tr.mapping, tr.doc);
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
