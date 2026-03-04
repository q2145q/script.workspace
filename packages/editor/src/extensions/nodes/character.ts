import { mergeAttributes, Node } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    character: {
      setCharacter: () => ReturnType;
    };
  }
}

export const Character = Node.create({
  name: "character",
  group: "block",
  content: "inline*",
  defining: true,
  marks: "",

  parseHTML() {
    return [{ tag: 'div[data-type="character"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "character",
        class: "screenplay-character",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCharacter:
        () =>
        ({ commands }) =>
          commands.setNode(this.name),
    };
  },
});
