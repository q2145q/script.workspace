"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { type JSONContent } from "@tiptap/core";
import { EditorToolbar } from "./EditorToolbar";

export interface ScriptEditorProps {
  content?: JSONContent;
  onUpdate?: (content: JSONContent) => void;
  editable?: boolean;
  className?: string;
}

export function ScriptEditor({
  content,
  onUpdate,
  editable = true,
  className,
}: ScriptEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Start writing your screenplay...",
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[calc(100vh-200px)] font-mono px-16 py-8",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className={className}>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
