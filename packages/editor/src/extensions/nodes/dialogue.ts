import { mergeAttributes, Node } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dialogue: {
      setDialogue: () => ReturnType;
    };
  }
}

export const Dialogue = Node.create({
  name: "dialogue",
  group: "block",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="dialogue"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "dialogue",
        class: "screenplay-dialogue",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setDialogue:
        () =>
        ({ commands }) =>
          commands.setNode(this.name),
    };
  },
});
