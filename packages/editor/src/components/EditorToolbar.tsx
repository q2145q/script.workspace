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
    <div className="flex items-center gap-2 border-b border-[var(--color-border,#e4e4e7)] px-4 py-2">
      <select
        value={state.activeNode}
        onChange={(e) => handleBlockTypeChange(e.target.value)}
        className="rounded border border-[var(--color-border,#e4e4e7)] bg-transparent px-2 py-1 text-xs font-medium"
      >
        {SCREENPLAY_NODES.map((name) => (
          <option key={name} value={name}>
            {NODE_LABELS[name]}
          </option>
        ))}
      </select>

      {state.canMark && (
        <>
          <div className="mx-1 h-4 w-px bg-[var(--color-border,#e4e4e7)]" />
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
      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-[var(--color-primary,#18181b)] text-[var(--color-primary-foreground,#fafafa)]"
          : "text-[var(--color-muted-foreground,#71717a)] hover:bg-[var(--color-muted,#f4f4f5)] hover:text-[var(--color-foreground,#09090b)]"
      }`}
    >
      {children}
    </button>
  );
}
