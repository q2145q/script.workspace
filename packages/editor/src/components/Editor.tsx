"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { type JSONContent, type Editor } from "@tiptap/core";
import { ScreenplayKit } from "../extensions/screenplay-kit";
import { EditorToolbar } from "./EditorToolbar";

export interface ScriptEditorProps {
  content?: JSONContent;
  onUpdate?: (content: JSONContent) => void;
  onEditorReady?: (editor: Editor) => void;
  editable?: boolean;
  className?: string;
}

export function ScriptEditor({
  content,
  onUpdate,
  onEditorReady,
  editable = true,
  className,
}: ScriptEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        codeBlock: false,
        code: false,
        strike: false,
        horizontalRule: false,
      }),
      ScreenplayKit,
      Placeholder.configure({
        placeholder: ({ node }) => {
          const placeholders: Record<string, string> = {
            sceneHeading: "INT. LOCATION — DAY",
            action: "Describe what happens...",
            character: "CHARACTER NAME",
            dialogue: "Dialogue...",
            parenthetical: "(pause)",
            transition: "CUT TO:",
          };
          return placeholders[node.type.name] || "Start writing...";
        },
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
          "screenplay-editor focus:outline-none min-h-[calc(100vh-200px)] px-16 py-8",
      },
    },
  });

  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  if (!editor) return null;

  return (
    <div className={className}>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
