import { mergeAttributes, Node, textblockTypeInputRule } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    transition: {
      setTransition: () => ReturnType;
    };
  }
}

export const Transition = Node.create({
  name: "transition",
  group: "block",
  content: "inline*",
  defining: true,
  marks: "",

  parseHTML() {
    return [{ tag: 'div[data-type="transition"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "transition",
        class: "screenplay-transition",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setTransition:
        () =>
        ({ commands }) =>
          commands.setNode(this.name),
    };
  },

  addInputRules() {
    return [
      textblockTypeInputRule({
        find: /^(CUT TO:\s)$/,
        type: this.type,
      }),
      textblockTypeInputRule({
        find: /^(FADE IN:\s)$/,
        type: this.type,
      }),
      textblockTypeInputRule({
        find: /^(FADE OUT\.\s)$/,
        type: this.type,
      }),
    ];
  },
});
