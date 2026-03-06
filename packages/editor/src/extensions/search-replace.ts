import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export const searchReplacePluginKey = new PluginKey("searchReplace");

interface SearchState {
  query: string;
  caseSensitive: boolean;
  regex: boolean;
  matches: Array<{ from: number; to: number }>;
  activeIndex: number;
}

function buildPositionMap(doc: ProseMirrorNode): Array<{ docPos: number; textOffset: number }> {
  const map: Array<{ docPos: number; textOffset: number }> = [];
  let textOffset = 0;

  doc.descendants((node, pos) => {
    if (node.isText) {
      map.push({ docPos: pos, textOffset });
      textOffset += node.text!.length;
    } else if (node.isBlock && pos > 0) {
      textOffset += 1; // block separator (\n)
    }
    return true;
  });

  return map;
}

function textOffsetToDocPos(map: Array<{ docPos: number; textOffset: number }>, offset: number): number {
  for (let i = map.length - 1; i >= 0; i--) {
    if (map[i].textOffset <= offset) {
      return map[i].docPos + (offset - map[i].textOffset);
    }
  }
  return 0;
}

function findMatches(
  doc: ProseMirrorNode,
  query: string,
  caseSensitive: boolean,
  useRegex: boolean
): Array<{ from: number; to: number }> {
  if (!query) return [];

  const fullText = doc.textBetween(0, doc.content.size, "\n");
  const posMap = buildPositionMap(doc);
  const matches: Array<{ from: number; to: number }> = [];

  try {
    let re: RegExp;
    if (useRegex) {
      re = new RegExp(query, caseSensitive ? "g" : "gi");
    } else {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      re = new RegExp(escaped, caseSensitive ? "g" : "gi");
    }

    let match: RegExpExecArray | null;
    while ((match = re.exec(fullText)) !== null) {
      if (match[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      const from = textOffsetToDocPos(posMap, match.index);
      const to = textOffsetToDocPos(posMap, match.index + match[0].length);
      matches.push({ from, to });
    }
  } catch {
    // Invalid regex — return empty
  }

  return matches;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    searchReplace: {
      setSearchQuery: (query: string) => ReturnType;
      setSearchOptions: (opts: { caseSensitive?: boolean; regex?: boolean }) => ReturnType;
      nextSearchMatch: () => ReturnType;
      prevSearchMatch: () => ReturnType;
      replaceCurrentMatch: (text: string) => ReturnType;
      replaceAllMatches: (text: string) => ReturnType;
      clearSearch: () => ReturnType;
    };
  }
}

export const SearchReplace = Extension.create({
  name: "searchReplace",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: searchReplacePluginKey,
        state: {
          init(): SearchState {
            return { query: "", caseSensitive: false, regex: false, matches: [], activeIndex: -1 };
          },
          apply(tr, state): SearchState {
            const meta = tr.getMeta(searchReplacePluginKey);
            if (meta) {
              return { ...state, ...meta };
            }
            // Recalculate matches if doc changed and we have a query
            if (tr.docChanged && state.query) {
              const matches = findMatches(tr.doc, state.query, state.caseSensitive, state.regex);
              const activeIndex = matches.length > 0
                ? Math.min(state.activeIndex, matches.length - 1)
                : -1;
              return { ...state, matches, activeIndex: Math.max(activeIndex, matches.length > 0 ? 0 : -1) };
            }
            return state;
          },
        },
        props: {
          decorations(state) {
            const searchState = searchReplacePluginKey.getState(state) as SearchState | undefined;
            if (!searchState || searchState.matches.length === 0) return DecorationSet.empty;

            const decorations = searchState.matches.map((match, i) =>
              Decoration.inline(match.from, match.to, {
                class: i === searchState.activeIndex ? "search-match-active" : "search-match",
              })
            );

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setSearchQuery:
        (query: string) =>
        ({ tr, dispatch, state: editorState }) => {
          if (!dispatch) return true;
          const prev = searchReplacePluginKey.getState(editorState) as SearchState;
          const matches = findMatches(tr.doc, query, prev.caseSensitive, prev.regex);
          const activeIndex = matches.length > 0 ? 0 : -1;
          tr.setMeta(searchReplacePluginKey, { query, matches, activeIndex });
          dispatch(tr);
          return true;
        },

      setSearchOptions:
        (opts: { caseSensitive?: boolean; regex?: boolean }) =>
        ({ tr, dispatch, state: editorState }) => {
          if (!dispatch) return true;
          const prev = searchReplacePluginKey.getState(editorState) as SearchState;
          const merged = { ...prev, ...opts };
          const matches = findMatches(tr.doc, merged.query, merged.caseSensitive, merged.regex);
          const activeIndex = matches.length > 0 ? 0 : -1;
          tr.setMeta(searchReplacePluginKey, { ...opts, matches, activeIndex });
          dispatch(tr);
          return true;
        },

      nextSearchMatch:
        () =>
        ({ tr, dispatch, editor, state: editorState }) => {
          if (!dispatch) return true;
          const prev = searchReplacePluginKey.getState(editorState) as SearchState;
          if (prev.matches.length === 0) return false;
          const nextIndex = (prev.activeIndex + 1) % prev.matches.length;
          tr.setMeta(searchReplacePluginKey, { activeIndex: nextIndex });
          dispatch(tr);
          const match = prev.matches[nextIndex];
          if (match) {
            setTimeout(() => {
              editor.commands.setTextSelection(match.from);
              editor.commands.scrollIntoView();
            }, 0);
          }
          return true;
        },

      prevSearchMatch:
        () =>
        ({ tr, dispatch, editor, state: editorState }) => {
          if (!dispatch) return true;
          const prev = searchReplacePluginKey.getState(editorState) as SearchState;
          if (prev.matches.length === 0) return false;
          const prevIndex = (prev.activeIndex - 1 + prev.matches.length) % prev.matches.length;
          tr.setMeta(searchReplacePluginKey, { activeIndex: prevIndex });
          dispatch(tr);
          const match = prev.matches[prevIndex];
          if (match) {
            setTimeout(() => {
              editor.commands.setTextSelection(match.from);
              editor.commands.scrollIntoView();
            }, 0);
          }
          return true;
        },

      replaceCurrentMatch:
        (text: string) =>
        ({ tr, dispatch, editor, state: editorState }) => {
          if (!dispatch) return true;
          const prev = searchReplacePluginKey.getState(editorState) as SearchState;
          if (prev.activeIndex < 0 || prev.activeIndex >= prev.matches.length) return false;
          const match = prev.matches[prev.activeIndex];
          tr.insertText(text, match.from, match.to);
          dispatch(tr);
          setTimeout(() => {
            editor.commands.setSearchQuery(prev.query);
          }, 0);
          return true;
        },

      replaceAllMatches:
        (text: string) =>
        ({ tr, dispatch, editor, state: editorState }) => {
          if (!dispatch) return true;
          const prev = searchReplacePluginKey.getState(editorState) as SearchState;
          if (prev.matches.length === 0) return false;
          for (let i = prev.matches.length - 1; i >= 0; i--) {
            const match = prev.matches[i];
            tr.insertText(text, match.from, match.to);
          }
          dispatch(tr);
          setTimeout(() => {
            editor.commands.setSearchQuery(prev.query);
          }, 0);
          return true;
        },

      clearSearch:
        () =>
        ({ tr, dispatch }) => {
          if (!dispatch) return true;
          tr.setMeta(searchReplacePluginKey, {
            query: "",
            matches: [],
            activeIndex: -1,
          });
          dispatch(tr);
          return true;
        },
    };
  },
});
