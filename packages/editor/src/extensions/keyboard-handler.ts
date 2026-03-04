import { Extension } from "@tiptap/core";
import {
  ENTER_TRANSITIONS,
  TAB_CYCLE,
  SCREENPLAY_NODES,
  type ScreenplayNodeType,
} from "../types/screenplay";

export const ScreenplayKeyboardHandler = Extension.create({
  name: "screenplayKeyboardHandler",

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { $from } = editor.state.selection;
        const currentNode = $from.parent;
        const currentType = currentNode.type.name as ScreenplayNodeType;

        if (
          !SCREENPLAY_NODES.includes(currentType as (typeof SCREENPLAY_NODES)[number])
        ) {
          return false;
        }

        // Empty block → reset to action
        if (currentNode.textContent.length === 0) {
          if (currentType === "action") return false; // let default handle
          return editor.commands.setAction();
        }

        const nextType = ENTER_TRANSITIONS[currentType] || "action";

        editor.chain().focus().splitBlock().setNode(nextType).scrollIntoView().run();

        return true;
      },

      Tab: ({ editor }) => {
        const { $from } = editor.state.selection;
        const currentType = $from.parent.type.name as ScreenplayNodeType;
        const currentIndex = TAB_CYCLE.indexOf(currentType);

        if (currentIndex === -1) return false;

        const nextIndex = (currentIndex + 1) % TAB_CYCLE.length;
        const nextType = TAB_CYCLE[nextIndex];

        return editor.commands.setNode(nextType);
      },

      "Shift-Tab": ({ editor }) => {
        const { $from } = editor.state.selection;
        const currentType = $from.parent.type.name as ScreenplayNodeType;
        const currentIndex = TAB_CYCLE.indexOf(currentType);

        if (currentIndex === -1) return false;

        const prevIndex =
          (currentIndex - 1 + TAB_CYCLE.length) % TAB_CYCLE.length;
        const prevType = TAB_CYCLE[prevIndex];

        return editor.commands.setNode(prevType);
      },
    };
  },
});
