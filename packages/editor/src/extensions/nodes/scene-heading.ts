import { mergeAttributes, Node, textblockTypeInputRule } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    sceneHeading: {
      setSceneHeading: () => ReturnType;
    };
  }
}

export const SceneHeading = Node.create({
  name: "sceneHeading",
  group: "block",
  content: "inline*",
  defining: true,
  marks: "",

  parseHTML() {
    return [{ tag: 'div[data-type="scene-heading"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "scene-heading",
        class: "screenplay-scene-heading",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setSceneHeading:
        () =>
        ({ commands }) =>
          commands.setNode(this.name),
    };
  },

  addInputRules() {
    return [
      textblockTypeInputRule({
        find: /^(INT\.\s)$/,
        type: this.type,
      }),
      textblockTypeInputRule({
        find: /^(EXT\.\s)$/,
        type: this.type,
      }),
      textblockTypeInputRule({
        find: /^(INT\.\/EXT\.\s)$/,
        type: this.type,
      }),
    ];
  },
});
