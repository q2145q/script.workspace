"use client";

import { useState, lazy, Suspense } from "react";
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
import { BibleEditor } from "./bible-editor";

const VersionsPanel = lazy(() =>
  import("./versions-panel").then((m) => ({ default: m.VersionsPanel }))
);
const OutlinePanel = lazy(() =>
  import("./outline-panel").then((m) => ({ default: m.OutlinePanel }))
);
const EntitiesPanel = lazy(() =>
  import("./entities-panel").then((m) => ({ default: m.EntitiesPanel }))
);

export type WorkspaceMode =
  | "script"
  | "bible"
  | "outline"
  | "characters"
  | "locations"
  | "versions";

interface WorkspaceShellProps {
  project: {
    id: string;
    title: string;
    type: string;
    documents: Array<{ id: string; title: string }>;
    episodes?: Array<{
      id: string;
      title: string;
      number: number;
      document: { id: string; title: string };
    }>;
  };
  document: {
    id: string;
    title: string;
    content: unknown;
  };
}

function PanelFallback() {
  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
    </div>
  );
}

export function WorkspaceShell({ project, document }: WorkspaceShellProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("script");

  const renderCenterPanel = () => {
    switch (workspaceMode) {
      case "script":
        return (
          <EditorArea
            document={document}
            projectTitle={project.title}
            projectId={project.id}
            onEditorReady={setEditor}
          />
        );
      case "bible":
        return <BibleEditor projectId={project.id} />;
      case "versions":
        return (
          <Suspense fallback={<PanelFallback />}>
            <VersionsPanel documentId={document.id} />
          </Suspense>
        );
      case "outline":
        return (
          <Suspense fallback={<PanelFallback />}>
            <OutlinePanel editor={editor} documentId={document.id} />
          </Suspense>
        );
      case "characters":
        return (
          <Suspense fallback={<PanelFallback />}>
            <EntitiesPanel projectId={project.id} defaultTab="characters" editor={editor} />
          </Suspense>
        );
      case "locations":
        return (
          <Suspense fallback={<PanelFallback />}>
            <EntitiesPanel projectId={project.id} defaultTab="locations" editor={editor} />
          </Suspense>
        );
      default:
        return null;
    }
  };

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
            workspaceMode={workspaceMode}
            onModeChange={setWorkspaceMode}
          />
        </ResizablePanel>

        <ResizableHandle className="w-px bg-border/50 transition-colors hover:bg-ai-accent/30" />

        <ResizablePanel defaultSize={60} minSize={40}>
          {renderCenterPanel()}
        </ResizablePanel>

        <ResizableHandle className="w-px bg-border/50 transition-colors hover:bg-ai-accent/30" />

        <ResizablePanel
          defaultSize={25}
          minSize={15}
          maxSize={35}
          className="glass-panel border-l border-sidebar-border"
        >
          <RightPanel editor={editor} documentId={document.id} projectId={project.id} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </motion.div>
  );
}
