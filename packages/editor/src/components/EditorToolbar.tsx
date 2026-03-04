"use client";

import type { Editor } from "@tiptap/react";

interface EditorToolbarProps {
  editor: Editor;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-1 border-b border-[var(--color-border,#e4e4e7)] px-4 py-2">
      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        I
      </ToolbarButton>
      <div className="mx-2 h-4 w-px bg-[var(--color-border,#e4e4e7)]" />
      <ToolbarButton
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <div className="mx-2 h-4 w-px bg-[var(--color-border,#e4e4e7)]" />
      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        List
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        Quote
      </ToolbarButton>
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
