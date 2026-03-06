"use client";

import { useState, useRef, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import type { Editor } from "@script/editor";
import type { ImperativePanelHandle } from "react-resizable-panels";
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
const KnowledgeGraphPanel = lazy(() =>
  import("./knowledge-graph-panel").then((m) => ({ default: m.KnowledgeGraphPanel }))
);
const OnePagerPanel = lazy(() =>
  import("./one-pager-panel").then((m) => ({ default: m.OnePagerPanel }))
);
const NotesPanel = lazy(() =>
  import("./notes-panel").then((m) => ({ default: m.NotesPanel }))
);

export type WorkspaceMode =
  | "script"
  | "bible"
  | "outline"
  | "characters"
  | "locations"
  | "versions"
  | "graph"
  | "one-pager"
  | "notes";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

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
  currentUser: CurrentUser;
}

function PanelFallback() {
  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
    </div>
  );
}

export function WorkspaceShell({ project, document, currentUser }: WorkspaceShellProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("script");
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);

  const renderCenterPanel = () => {
    switch (workspaceMode) {
      case "script":
        return (
          <EditorArea
            document={document}
            projectTitle={project.title}
            projectId={project.id}
            onEditorReady={setEditor}
            currentUser={currentUser}
          />
        );
      case "bible":
        return <BibleEditor projectId={project.id} currentUser={currentUser} />;
      case "versions":
        return (
          <Suspense fallback={<PanelFallback />}>
            <VersionsPanel documentId={document.id} />
          </Suspense>
        );
      case "outline":
        return (
          <Suspense fallback={<PanelFallback />}>
            <OutlinePanel editor={editor} documentId={document.id} projectId={project.id} />
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
      case "graph":
        return (
          <Suspense fallback={<PanelFallback />}>
            <KnowledgeGraphPanel projectId={project.id} editor={editor} />
          </Suspense>
        );
      case "one-pager":
        return (
          <Suspense fallback={<PanelFallback />}>
            <OnePagerPanel projectId={project.id} />
          </Suspense>
        );
      case "notes":
        return (
          <Suspense fallback={<PanelFallback />}>
            <NotesPanel projectId={project.id} currentUser={currentUser} />
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

        <ResizablePanel defaultSize={rightPanelOpen ? 60 : 85} minSize={40}>
          <div className="relative h-full">
            {renderCenterPanel()}
            {/* Show reopen button when right panel is collapsed */}
            {!rightPanelOpen && (
              <button
                onClick={() => rightPanelRef.current?.expand()}
                className="absolute right-2 top-2.5 z-20 rounded-md border border-border bg-background/80 p-1 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
                title="Show panel"
              >
                <PanelRightOpen className="h-4 w-4" />
              </button>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle className="w-px bg-border/50 transition-colors hover:bg-ai-accent/30" />

        <ResizablePanel
          ref={rightPanelRef}
          defaultSize={25}
          minSize={15}
          maxSize={35}
          collapsible
          collapsedSize={0}
          onCollapse={() => setRightPanelOpen(false)}
          onExpand={() => setRightPanelOpen(true)}
          className="glass-panel border-l border-sidebar-border"
        >
          <RightPanel
            editor={editor}
            documentId={document.id}
            projectId={project.id}
            onToggle={() => {
              if (rightPanelOpen) {
                rightPanelRef.current?.collapse();
              } else {
                rightPanelRef.current?.expand();
              }
            }}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </motion.div>
  );
}
