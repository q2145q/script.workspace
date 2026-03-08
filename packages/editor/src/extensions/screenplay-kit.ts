import { Extension } from "@tiptap/core";
import {
  SceneHeading,
  Action,
  Character,
  Dialogue,
  Parenthetical,
  Transition,
  Shot,
} from "./nodes";
import { ScreenplayKeyboardHandler } from "./keyboard-handler";
import { ParagraphGuard } from "./paragraph-guard";
import { CommentMark } from "./comment-mark";
import { SelectionHighlight } from "./selection-highlight";
import { SuggestionDecoration } from "./suggestion-decoration";
import { AutocompleteExtension } from "./autocomplete/autocomplete-extension";
import { SearchReplace } from "./search-replace";
import { PageBreakDecoration } from "./page-break-decoration";

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
      Shot,
      ScreenplayKeyboardHandler,
      ParagraphGuard,
      CommentMark,
      SelectionHighlight,
      SuggestionDecoration,
      AutocompleteExtension,
      SearchReplace,
      PageBreakDecoration,
    ];
  },
});
