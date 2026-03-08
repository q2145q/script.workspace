"use client";

import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { PanelRightOpen, Menu, X } from "lucide-react";
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
import { GlobalSearchDialog } from "./global-search-dialog";

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
const SceneBoard = lazy(() =>
  import("./scene-board").then((m) => ({ default: m.SceneBoard }))
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
  | "notes"
  | "scene-board";

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
  const t = useTranslations("Editor");
  const searchParams = useSearchParams();
  const [editor, setEditor] = useState<Editor | null>(null);

  // Read initial mode from URL ?mode= param
  const VALID_MODES: WorkspaceMode[] = [
    "script", "bible", "outline", "characters", "locations",
    "versions", "graph", "one-pager", "notes", "scene-board",
  ];
  const urlMode = searchParams.get("mode") as WorkspaceMode | null;
  const initialMode = urlMode && VALID_MODES.includes(urlMode) ? urlMode : "script";

  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(initialMode);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sync mode to URL without navigation + close mobile sidebar
  const handleModeChange = useCallback((mode: WorkspaceMode) => {
    setWorkspaceMode(mode);
    setMobileSidebarOpen(false);
    const url = new URL(window.location.href);
    if (mode === "script") {
      url.searchParams.delete("mode");
    } else {
      url.searchParams.set("mode", mode);
    }
    window.history.replaceState(null, "", url.toString());
  }, []);

  // Cmd+Shift+F to open global search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
        e.preventDefault();
        setGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close mobile sidebar on Escape
  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mobileSidebarOpen]);

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
      case "scene-board":
        return (
          <Suspense fallback={<PanelFallback />}>
            <SceneBoard editor={editor} documentId={document.id} projectId={project.id} />
          </Suspense>
        );
      default:
        return null;
    }
  };

  const sidebarContent = (
    <WorkspaceSidebar
      project={project}
      activeDocumentId={document.id}
      editor={editor}
      workspaceMode={workspaceMode}
      onModeChange={handleModeChange}
    />
  );

  return (
    <motion.div
      className="h-screen overflow-hidden bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Desktop sidebar — hidden on mobile */}
        <ResizablePanel
          defaultSize={15}
          minSize={10}
          maxSize={25}
          className="glass-panel border-r border-sidebar-border max-md:hidden"
        >
          {sidebarContent}
        </ResizablePanel>

        <ResizableHandle className="w-px bg-border/50 transition-colors hover:bg-ai-accent/30 max-md:hidden" />

        <ResizablePanel defaultSize={rightPanelOpen ? 60 : 85} minSize={40}>
          <div className="relative h-full">
            {/* Mobile hamburger button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="absolute left-2 top-2.5 z-20 rounded-md border border-border bg-background/80 p-1 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            {renderCenterPanel()}
            {/* Show reopen button when right panel is collapsed */}
            {!rightPanelOpen && (
              <button
                onClick={() => rightPanelRef.current?.expand()}
                className="absolute right-2 top-2.5 z-20 rounded-md border border-border bg-background/80 p-1 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
                title={t("showPanel")}
              >
                <PanelRightOpen className="h-4 w-4" />
              </button>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle className="w-px bg-border/50 transition-colors hover:bg-ai-accent/30 max-md:hidden" />

        <ResizablePanel
          ref={rightPanelRef}
          defaultSize={25}
          minSize={15}
          maxSize={35}
          collapsible
          collapsedSize={0}
          onCollapse={() => setRightPanelOpen(false)}
          onExpand={() => setRightPanelOpen(true)}
          className="glass-panel border-l border-sidebar-border max-md:hidden"
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

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 w-72 bg-background shadow-xl md:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="absolute right-2 top-2 z-10 rounded-md p-1 text-muted-foreground hover:text-foreground"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <GlobalSearchDialog
        open={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        projectId={project.id}
      />
    </motion.div>
  );
}
