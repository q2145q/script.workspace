"use client";

import { useEffect, useMemo, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { type JSONContent, type Editor } from "@tiptap/core";
import { ScreenplayKit } from "../extensions/screenplay-kit";
import { EditorToolbar } from "./EditorToolbar";
import { AutocompleteDropdown } from "./AutocompleteDropdown";

export interface CollaborationConfig {
  documentName: string;
  wsUrl: string;
  user: { id: string; name: string; color: string };
}

export interface ScriptEditorProps {
  content?: JSONContent;
  onUpdate?: (content: JSONContent) => void;
  onEditorReady?: (editor: Editor) => void;
  editable?: boolean;
  hideToolbar?: boolean;
  className?: string;
  collaboration?: CollaborationConfig;
  onCollabProvider?: (provider: HocuspocusProvider) => void;
  /** When true, uses plain text editing (no screenplay blocks) */
  plainText?: boolean;
}

export function ScriptEditor({
  content,
  onUpdate,
  onEditorReady,
  editable = true,
  hideToolbar = false,
  className,
  collaboration,
  onCollabProvider,
  plainText = false,
}: ScriptEditorProps) {
  const providerRef = useRef<HocuspocusProvider | null>(null);

  // Create Yjs doc and Hocuspocus provider when collaboration is enabled
  const collabState = useMemo(() => {
    if (!collaboration) return null;

    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: collaboration.wsUrl,
      name: collaboration.documentName,
      document: ydoc,
      token: "cookie-auth", // actual auth is via cookies
    });

    return { ydoc, provider };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collaboration?.documentName, collaboration?.wsUrl]);

  // Manage provider lifecycle
  useEffect(() => {
    if (collabState) {
      providerRef.current = collabState.provider;
      onCollabProvider?.(collabState.provider);
    }

    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collabState]);

  const extensions = useMemo(() => {
    const base = [
      StarterKit.configure(plainText ? {
        // Plain text mode: enable standard formatting
        history: collaboration ? false : undefined,
      } : {
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        codeBlock: false,
        code: false,
        strike: false,
        horizontalRule: false,
        // Disable built-in history when collaboration is active (Yjs has its own)
        history: collaboration ? false : undefined,
      }),
      ...(plainText ? [] : [ScreenplayKit]),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (plainText) return "Start writing...";
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
    ];

    if (collaboration && collabState) {
      base.push(
        Collaboration.configure({
          document: collabState.ydoc,
        }) as typeof ScreenplayKit,
        CollaborationCursor.configure({
          provider: collabState.provider,
          user: {
            name: collaboration.user.name,
            color: collaboration.user.color,
          },
        }) as typeof ScreenplayKit,
      );
    }

    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collaboration?.documentName, collaboration?.wsUrl, collabState, plainText]);

  const editor = useEditor({
    extensions,
    // Only pass content when NOT collaborating (Yjs loads from provider)
    content: collaboration ? undefined : content,
    editable,
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: plainText
          ? "prose prose-sm max-w-none focus:outline-none min-h-[200px] px-6 pt-4 pb-8"
          : "screenplay-editor focus:outline-none min-h-[calc(100vh-200px)] px-16 pt-8 pb-[50vh]",
      },
    },
  });

  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  if (!editor) return null;

  return (
    <div className={className}>
      {!hideToolbar && (
        <div className="sticky top-0 z-10 bg-[var(--color-background,#fff)]">
          <EditorToolbar editor={editor} />
        </div>
      )}
      <EditorContent editor={editor} />
      {!plainText && <AutocompleteDropdown editor={editor} />}
    </div>
  );
}
