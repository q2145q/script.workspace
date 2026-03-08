import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import {
  SCENE_TYPES,
  TIME_OF_DAY,
  parseSceneHeadingPhase,
  extractLocationsFromDoc,
  extractCharacterNamesFromDoc,
  type SceneHeadingPhase,
} from "./autocomplete-utils";

// --- Plugin State ---

export interface AutocompleteState {
  active: boolean;
  items: string[];
  selectedIndex: number;
  /** Absolute doc position where replacement starts */
  from: number;
  /** Absolute doc position where replacement ends */
  to: number;
  /** What kind of autocomplete is active */
  context: "sceneHeading" | "character" | null;
  /** Current phase for scene heading */
  phase: SceneHeadingPhase | null;
  /** Whether dropdown was explicitly dismissed */
  dismissed: boolean;
}

const EMPTY_STATE: AutocompleteState = {
  active: false,
  items: [],
  selectedIndex: 0,
  from: 0,
  to: 0,
  context: null,
  phase: null,
  dismissed: false,
};

export const autocompletePluginKey = new PluginKey<AutocompleteState>(
  "autocomplete"
);

function filterItems(items: string[], query: string): string[] {
  if (!query) return items;
  const q = query.toUpperCase();
  return items.filter((item) => item.toUpperCase().startsWith(q));
}

function computeState(view: EditorView, prevDismissed: boolean): AutocompleteState {
  const { state } = view;
  const { selection } = state;

  // Only works with cursor (not range selection)
  if (!selection.empty) return EMPTY_STATE;

  const $from = selection.$from;
  const parentNode = $from.parent;
  const nodeType = parentNode.type.name;
  const nodeStart = $from.before($from.depth) + 1; // position of first char in node
  const text = parentNode.textContent;
  const cursorOffset = $from.pos - nodeStart;

  if (nodeType === "sceneHeading") {
    const parsed = parseSceneHeadingPhase(text, cursorOffset);
    let items: string[] = [];

    switch (parsed.phase) {
      case "type":
        items = filterItems(SCENE_TYPES, parsed.query);
        break;
      case "location": {
        const locations = extractLocationsFromDoc(state.doc);
        items = filterItems(Array.from(locations.keys()), parsed.query);
        break;
      }
      case "subLocation": {
        if (parsed.location) {
          const locations = extractLocationsFromDoc(state.doc);
          const subs = locations.get(parsed.location);
          if (subs) {
            items = filterItems(Array.from(subs), parsed.query);
          }
        }
        break;
      }
      case "timeOfDay":
        items = filterItems(TIME_OF_DAY, parsed.query);
        break;
    }

    if (items.length === 0 || prevDismissed) {
      return EMPTY_STATE;
    }

    // If query exactly matches the only item, don't show dropdown
    if (items.length === 1 && items[0].toUpperCase() === parsed.query.toUpperCase()) {
      return EMPTY_STATE;
    }

    return {
      active: true,
      items,
      selectedIndex: 0,
      from: nodeStart + parsed.replaceFrom,
      to: $from.pos,
      context: "sceneHeading",
      phase: parsed.phase,
      dismissed: false,
    };
  }

  if (nodeType === "character") {
    const query = text.slice(0, cursorOffset).trim().toUpperCase();
    const allNames = extractCharacterNamesFromDoc(state.doc);
    // Exclude the current exact text (don't suggest what's already typed fully)
    const items = filterItems(allNames, query).filter(
      (name) => name !== query || query === ""
    );

    if (items.length === 0 || prevDismissed) {
      return EMPTY_STATE;
    }

    return {
      active: true,
      items,
      selectedIndex: 0,
      from: nodeStart,
      to: nodeStart + text.length,
      context: "character",
      phase: null,
      dismissed: false,
    };
  }

  return EMPTY_STATE;
}

// --- TipTap Extension ---

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    autocomplete: {
      acceptAutocomplete: () => ReturnType;
      dismissAutocomplete: () => ReturnType;
    };
  }
}

export const AutocompleteExtension = Extension.create({
  name: "autocomplete",

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin<AutocompleteState>({
        key: autocompletePluginKey,

        state: {
          init() {
            return EMPTY_STATE;
          },
          apply(tr, prev, _oldState, newState) {
            // If the transaction has a meta to force a state, use it
            const meta = tr.getMeta(autocompletePluginKey);
            if (meta !== undefined) {
              return meta as AutocompleteState;
            }
            // Recalculate will happen in view.update
            return prev;
          },
        },

        view() {
          // Skip autocomplete during initial editor mount / Yjs sync
          // to prevent the dropdown from appearing immediately on open
          const mountTime = Date.now();
          const MOUNT_GRACE_MS = 1500;

          return {
            update(view, prevState) {
              if (Date.now() - mountTime < MOUNT_GRACE_MS) return;

              // Only show autocomplete when user is actively typing
              // (doc content changed), not on cursor placement alone
              const docChanged = !prevState.doc.eq(view.state.doc);
              const prev = autocompletePluginKey.getState(prevState);

              // If doc didn't change and autocomplete is not already active, skip
              if (!docChanged && !prev?.active) return;

              // Reset dismissed flag when the cursor moves or text changes
              const prevDismissed =
                prev?.dismissed &&
                prevState.selection.eq(view.state.selection) &&
                !docChanged
                  ? true
                  : false;

              const next = computeState(view, prevDismissed);
              const current = autocompletePluginKey.getState(view.state);

              // Only dispatch if state actually changed
              if (
                current &&
                current.active === next.active &&
                current.items.length === next.items.length &&
                current.from === next.from &&
                current.to === next.to &&
                current.phase === next.phase
              ) {
                return;
              }

              const tr = view.state.tr.setMeta(autocompletePluginKey, next);
              tr.setMeta("addToHistory", false);
              view.dispatch(tr);
            },
          };
        },

        props: {
          handleKeyDown(view, event) {
            const pluginState = autocompletePluginKey.getState(view.state);
            if (!pluginState?.active) return false;

            const { items, selectedIndex } = pluginState;

            switch (event.key) {
              case "ArrowDown": {
                event.preventDefault();
                const next = (selectedIndex + 1) % items.length;
                const tr = view.state.tr.setMeta(autocompletePluginKey, {
                  ...pluginState,
                  selectedIndex: next,
                });
                tr.setMeta("addToHistory", false);
                view.dispatch(tr);
                return true;
              }
              case "ArrowUp": {
                event.preventDefault();
                const next =
                  (selectedIndex - 1 + items.length) % items.length;
                const tr = view.state.tr.setMeta(autocompletePluginKey, {
                  ...pluginState,
                  selectedIndex: next,
                });
                tr.setMeta("addToHistory", false);
                view.dispatch(tr);
                return true;
              }
              case "Enter": {
                event.preventDefault();
                acceptFromPlugin(view, pluginState);
                return true;
              }
              case "Escape": {
                event.preventDefault();
                const tr = view.state.tr.setMeta(autocompletePluginKey, {
                  ...EMPTY_STATE,
                  dismissed: true,
                });
                tr.setMeta("addToHistory", false);
                view.dispatch(tr);
                return true;
              }
              default:
                return false;
            }
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      acceptAutocomplete:
        () =>
        ({ view }) => {
          const pluginState = autocompletePluginKey.getState(view.state);
          if (!pluginState?.active) return false;
          acceptFromPlugin(view, pluginState);
          return true;
        },
      dismissAutocomplete:
        () =>
        ({ view }) => {
          const tr = view.state.tr.setMeta(autocompletePluginKey, {
            ...EMPTY_STATE,
            dismissed: true,
          });
          tr.setMeta("addToHistory", false);
          view.dispatch(tr);
          return true;
        },
    };
  },
});

function acceptFromPlugin(view: EditorView, pluginState: AutocompleteState) {
  const { items, selectedIndex, from, to, context, phase } = pluginState;
  const selected = items[selectedIndex];
  if (!selected) return;

  let insertText = selected;

  // For scene heading type phase, add trailing space
  if (context === "sceneHeading" && phase === "type") {
    insertText = selected + " ";
  }

  const tr = view.state.tr.replaceWith(
    from,
    to,
    view.state.schema.text(insertText)
  );

  // Place cursor at end of inserted text
  const cursorPos = from + insertText.length;
  tr.setSelection(TextSelection.create(tr.doc, cursorPos));

  // Clear autocomplete state — new state will be recalculated in view.update
  tr.setMeta(autocompletePluginKey, EMPTY_STATE);

  view.dispatch(tr);
  view.focus();
}

/** Helper to accept a specific item by index (used by dropdown click) */
export function acceptAutocompleteItem(view: EditorView, index: number) {
  const pluginState = autocompletePluginKey.getState(view.state);
  if (!pluginState?.active) return;
  acceptFromPlugin(view, { ...pluginState, selectedIndex: index });
}
