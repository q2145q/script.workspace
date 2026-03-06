/**
 * Headless ProseMirror schema builder for the screenplay editor.
 * Used by both the client-side editor and the collab server (no React dependency).
 */
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {
  SceneHeading,
  Action,
  Character,
  Dialogue,
  Parenthetical,
  Transition,
  Shot,
} from "./extensions/nodes";
import { CommentMark } from "./extensions/comment-mark";

export function getScreenplaySchema() {
  return getSchema([
    StarterKit.configure({
      heading: false,
      blockquote: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      codeBlock: false,
      code: false,
      strike: false,
      horizontalRule: false,
    }),
    SceneHeading,
    Action,
    Character,
    Dialogue,
    Parenthetical,
    Transition,
    Shot,
    CommentMark,
  ]);
}
