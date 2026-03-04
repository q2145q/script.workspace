import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    commentMark: {
      setComment: (attrs: { threadId: string }) => ReturnType;
      unsetComment: () => ReturnType;
    };
  }
}

export const CommentMark = Mark.create({
  name: "comment",
  inclusive: false,

  addAttributes() {
    return {
      threadId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-comment-thread-id"),
        renderHTML: (attrs) => ({
          "data-comment-thread-id": attrs.threadId,
        }),
      },
      resolved: {
        default: false,
        parseHTML: (el) => el.getAttribute("data-comment-resolved") === "true",
        renderHTML: (attrs) => ({
          "data-comment-resolved": String(attrs.resolved),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-comment-thread-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const resolved = HTMLAttributes["data-comment-resolved"] === "true";
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: resolved ? "comment-highlight-resolved" : "comment-highlight",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setComment:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetComment:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
