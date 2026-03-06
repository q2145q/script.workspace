import { mergeAttributes, Node, textblockTypeInputRule } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    shot: {
      setShot: () => ReturnType;
    };
  }
}

export const Shot = Node.create({
  name: "shot",
  group: "block",
  content: "inline*",
  defining: true,
  marks: "",

  parseHTML() {
    return [{ tag: 'div[data-type="shot"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "shot",
        class: "screenplay-shot",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setShot:
        () =>
        ({ commands }) =>
          commands.setNode(this.name),
    };
  },

  addInputRules() {
    return [
      textblockTypeInputRule({ find: /^(SHOT:\s)$/, type: this.type }),
      textblockTypeInputRule({ find: /^(ПЛАН:\s)$/, type: this.type }),
    ];
  },
});
