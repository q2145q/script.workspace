import { Extension } from "@tiptap/core";
import {
  SceneHeading,
  Action,
  Character,
  Dialogue,
  Parenthetical,
  Transition,
} from "./nodes";
import { ScreenplayKeyboardHandler } from "./keyboard-handler";
import { ParagraphGuard } from "./paragraph-guard";

export const ScreenplayKit = Extension.create({
  name: "screenplayKit",

  addExtensions() {
    return [
      SceneHeading,
      Action,
      Character,
      Dialogue,
      Parenthetical,
      Transition,
      ScreenplayKeyboardHandler,
      ParagraphGuard,
    ];
  },
});
