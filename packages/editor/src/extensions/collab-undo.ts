import { Extension } from "@tiptap/core";
import * as Y from "yjs";

/**
 * TipTap extension that wires Yjs UndoManager for undo/redo
 * in collaborative editing mode (where built-in history is disabled).
 *
 * Usage:
 *   CollabUndo.configure({ yDoc: ydoc, field: "default" })
 *
 * Binds: Cmd+Z → undo, Cmd+Shift+Z / Cmd+Y → redo
 */
export const CollabUndo = Extension.create({
  name: "collabUndo",

  addOptions() {
    return {
      yDoc: null as Y.Doc | null,
      field: "default",
    };
  },

  addStorage() {
    return {
      undoManager: null as Y.UndoManager | null,
    };
  },

  onCreate() {
    const { yDoc, field } = this.options;
    if (!yDoc) return;

    const fragment = yDoc.getXmlFragment(field);
    this.storage.undoManager = new Y.UndoManager(fragment, {
      // Track the origin of remote changes to exclude them from undo
      trackedOrigins: new Set([null]),
      captureTimeout: 500,
    });
  },

  onDestroy() {
    this.storage.undoManager?.destroy();
    this.storage.undoManager = null;
  },

  addKeyboardShortcuts() {
    return {
      "Mod-z": () => {
        const um = this.storage.undoManager;
        if (!um || um.undoStack.length === 0) return false;
        um.undo();
        return true;
      },
      "Mod-Shift-z": () => {
        const um = this.storage.undoManager;
        if (!um || um.redoStack.length === 0) return false;
        um.redo();
        return true;
      },
      "Mod-y": () => {
        const um = this.storage.undoManager;
        if (!um || um.redoStack.length === 0) return false;
        um.redo();
        return true;
      },
    };
  },
});
