import { mergeAttributes, Node } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    action: {
      setAction: () => ReturnType;
    };
  }
}

export const Action = Node.create({
  name: "action",
  group: "block",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="action"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "action",
        class: "screenplay-action",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setAction:
        () =>
        ({ commands }) =>
          commands.setNode(this.name),
    };
  },
});
