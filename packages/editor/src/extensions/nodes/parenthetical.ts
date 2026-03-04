import { mergeAttributes, Node } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    parenthetical: {
      setParenthetical: () => ReturnType;
    };
  }
}

export const Parenthetical = Node.create({
  name: "parenthetical",
  group: "block",
  content: "inline*",
  defining: true,
  marks: "",

  parseHTML() {
    return [{ tag: 'div[data-type="parenthetical"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "parenthetical",
        class: "screenplay-parenthetical",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setParenthetical:
        () =>
        ({ commands }) =>
          commands.setNode(this.name),
    };
  },
});
