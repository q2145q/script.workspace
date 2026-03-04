import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface SuggestionData {
  id: string;
  from: number;
  to: number;
  newText: string;
  nodeType?: string;
}

const suggestionKey = new PluginKey("suggestionDecoration");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    suggestionDecoration: {
      setSuggestion: (data: SuggestionData) => ReturnType;
      clearSuggestion: (id: string) => ReturnType;
      clearAllSuggestions: () => ReturnType;
    };
  }
}

interface SuggestionState {
  suggestions: Map<string, SuggestionData>;
}

export const SuggestionDecoration = Extension.create({
  name: "suggestionDecoration",

  addCommands() {
    return {
      setSuggestion:
        (data) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(suggestionKey, { type: "set", data });
          }
          return true;
        },
      clearSuggestion:
        (id) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(suggestionKey, { type: "clear", id });
          }
          return true;
        },
      clearAllSuggestions:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(suggestionKey, { type: "clearAll" });
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: suggestionKey,
        state: {
          init(): SuggestionState {
            return { suggestions: new Map() };
          },
          apply(tr, state): SuggestionState {
            const meta = tr.getMeta(suggestionKey);

            if (meta) {
              const newMap = new Map(state.suggestions);

              if (meta.type === "set") {
                newMap.set(meta.data.id, meta.data);
              } else if (meta.type === "clear") {
                newMap.delete(meta.id);
              } else if (meta.type === "clearAll") {
                return { suggestions: new Map() };
              }

              return { suggestions: newMap };
            }

            // Map positions through document changes
            if (tr.docChanged) {
              const newMap = new Map<string, SuggestionData>();
              for (const [id, s] of state.suggestions) {
                const from = tr.mapping.map(s.from);
                const to = tr.mapping.map(s.to);
                if (from < to) {
                  newMap.set(id, { ...s, from, to });
                }
              }
              return { suggestions: newMap };
            }

            return state;
          },
        },
        props: {
          decorations(editorState) {
            const pluginState = suggestionKey.getState(editorState) as SuggestionState | undefined;
            if (!pluginState || pluginState.suggestions.size === 0) {
              return DecorationSet.empty;
            }

            const decorations: Decoration[] = [];

            for (const [id, suggestion] of pluginState.suggestions) {
              // Deletion decoration: highlight the original text
              decorations.push(
                Decoration.inline(suggestion.from, suggestion.to, {
                  class: "suggestion-deletion",
                  "data-suggestion-id": id,
                })
              );

              // Addition decoration: widget after the selection showing new text
              const widget = document.createElement("span");
              widget.className = "suggestion-addition";
              widget.textContent = suggestion.newText;
              widget.setAttribute("data-suggestion-id", id);

              decorations.push(
                Decoration.widget(suggestion.to, widget, {
                  side: 1,
                  key: `suggestion-add-${id}`,
                })
              );
            }

            return DecorationSet.create(editorState.doc, decorations);
          },
        },
      }),
    ];
  },
});
