"use client";

import { type Editor, useEditorState } from "@tiptap/react";
import {
  SCREENPLAY_NODES,
  type ScreenplayNodeType,
} from "../types/screenplay";

const NODE_LABELS: Record<ScreenplayNodeType, string> = {
  sceneHeading: "Scene Heading",
  action: "Action",
  character: "Character",
  dialogue: "Dialogue",
  parenthetical: "Parenthetical",
  transition: "Transition",
  shot: "Shot",
};

interface EditorToolbarProps {
  editor: Editor;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const state = useEditorState({
    editor,
    selector: (ctx) => {
      const active = SCREENPLAY_NODES.find((name) =>
        ctx.editor.isActive(name)
      );
      return {
        activeNode: (active || "action") as ScreenplayNodeType,
        bold: ctx.editor.isActive("bold"),
        italic: ctx.editor.isActive("italic"),
        canMark: active === "action" || active === "dialogue",
      };
    },
  });

  const handleBlockTypeChange = (type: string) => {
    editor.chain().focus().setNode(type).run();
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <select
        value={state.activeNode}
        onChange={(e) => handleBlockTypeChange(e.target.value)}
        className="rounded-md border border-border bg-muted/50 px-2 py-1 text-xs font-medium text-foreground transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {SCREENPLAY_NODES.map((name) => (
          <option key={name} value={name}>
            {NODE_LABELS[name]}
          </option>
        ))}
      </select>

      {state.canMark && (
        <>
          <div className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton
            active={state.bold}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            B
          </ToolbarButton>
          <ToolbarButton
            active={state.italic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            I
          </ToolbarButton>
        </>
      )}
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-xs font-medium transition-all duration-200 ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
