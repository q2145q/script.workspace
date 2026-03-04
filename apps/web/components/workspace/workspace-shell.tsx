"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Editor } from "@script/editor";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/workspace/resizable";
import { WorkspaceSidebar } from "./workspace-sidebar";
import { RightPanel } from "./right-panel";
import { EditorArea } from "./editor-area";

interface WorkspaceShellProps {
  project: {
    id: string;
    title: string;
    documents: Array<{ id: string; title: string }>;
  };
  document: {
    id: string;
    title: string;
    content: unknown;
  };
}

export function WorkspaceShell({ project, document }: WorkspaceShellProps) {
  const [editor, setEditor] = useState<Editor | null>(null);

  return (
    <motion.div
      className="h-screen overflow-hidden bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel
          defaultSize={15}
          minSize={10}
          maxSize={25}
          className="glass-panel border-r border-sidebar-border"
        >
          <WorkspaceSidebar
            project={project}
            activeDocumentId={document.id}
            editor={editor}
          />
        </ResizablePanel>

        <ResizableHandle className="w-px bg-border/50 transition-colors hover:bg-ai-accent/30" />

        <ResizablePanel defaultSize={60} minSize={40}>
          <EditorArea document={document} onEditorReady={setEditor} />
        </ResizablePanel>

        <ResizableHandle className="w-px bg-border/50 transition-colors hover:bg-ai-accent/30" />

        <ResizablePanel
          defaultSize={25}
          minSize={15}
          maxSize={35}
          className="glass-panel border-l border-sidebar-border"
        >
          <RightPanel editor={editor} documentId={document.id} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </motion.div>
  );
}
