"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  autocompletePluginKey,
  acceptAutocompleteItem,
  type AutocompleteState,
} from "../extensions/autocomplete/autocomplete-extension";

interface AutocompleteDropdownProps {
  editor: Editor | null;
}

const EMPTY: AutocompleteState = {
  active: false,
  items: [],
  selectedIndex: 0,
  from: 0,
  to: 0,
  context: null,
  phase: null,
  dismissed: false,
};

/** Max height of the dropdown (must match CSS max-height) */
const DROPDOWN_MAX_H = 200;
const GAP = 4;

export function AutocompleteDropdown({ editor }: AutocompleteDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    left: number;
    top: number;
    flipUp: boolean;
  } | null>(null);

  const state = useEditorState({
    editor: editor!,
    selector: (ctx): AutocompleteState => {
      if (!ctx.editor) return EMPTY;
      return autocompletePluginKey.getState(ctx.editor.state) ?? EMPTY;
    },
  });

  const updatePosition = useCallback(() => {
    if (!editor || !state.active) {
      setPos(null);
      return;
    }

    try {
      const cursorCoords = editor.view.coordsAtPos(state.from);
      const viewportH = window.innerHeight;
      const spaceBelow = viewportH - cursorCoords.bottom - GAP;
      const spaceAbove = cursorCoords.top - GAP;
      const flipUp = spaceBelow < DROPDOWN_MAX_H && spaceAbove > spaceBelow;

      // Auto-scroll the cursor into a comfortable zone if it's near the bottom
      const scrollContainer = editor.view.dom.closest(".overflow-y-auto");
      if (scrollContainer && cursorCoords.bottom > viewportH - 60) {
        scrollContainer.scrollBy({ top: 120, behavior: "smooth" });
      }

      setPos({
        left: cursorCoords.left,
        top: flipUp ? cursorCoords.top : cursorCoords.bottom + GAP,
        flipUp,
      });
    } catch {
      setPos(null);
    }
  }, [editor, state.active, state.from]);

  // Recalculate position when state changes
  useEffect(() => {
    updatePosition();
  }, [updatePosition, state.items.length]);

  // Reposition on scroll
  useEffect(() => {
    if (!editor || !state.active) return;
    const scrollContainer = editor.view.dom.closest(".overflow-y-auto");
    if (!scrollContainer) return;

    const onScroll = () => updatePosition();
    scrollContainer.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", onScroll);
  }, [editor, state.active, updatePosition]);

  // Scroll selected item into view inside the dropdown
  useEffect(() => {
    if (!menuRef.current) return;
    const selected = menuRef.current.querySelector("[data-selected]");
    selected?.scrollIntoView({ block: "nearest" });
  }, [state.selectedIndex]);

  if (!editor || !state.active || !pos) return null;

  const phaseLabel =
    state.context === "sceneHeading"
      ? state.phase === "type"
        ? "Тип сцены"
        : state.phase === "location"
          ? "Локация"
          : state.phase === "subLocation"
            ? "Подобъект"
            : "Время суток"
      : "Персонаж";

  const style: React.CSSProperties = {
    position: "fixed",
    left: pos.left,
    zIndex: 50,
    ...(pos.flipUp
      ? { bottom: window.innerHeight - pos.top + GAP }
      : { top: pos.top }),
  };

  return (
    <div ref={menuRef} className="autocomplete-dropdown" style={style}>
      <div className="autocomplete-header">{phaseLabel}</div>
      <div className="autocomplete-list">
        {state.items.map((item, i) => (
          <button
            key={item}
            data-selected={i === state.selectedIndex ? "" : undefined}
            className={`autocomplete-item ${i === state.selectedIndex ? "autocomplete-item-selected" : ""}`}
            onMouseDown={(e) => {
              e.preventDefault();
              acceptAutocompleteItem(editor.view, i);
            }}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
