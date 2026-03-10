"use client";

import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  Menu, X, MessageSquare, MessageCircle, Pin,
  BarChart3, Activity,
} from "lucide-react";
import type { Editor } from "@script/editor";
import type { ImperativePanelHandle } from "react-resizable-panels";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/workspace/resizable";
import { WorkspaceSidebar, navItemsConfig } from "./workspace-sidebar";
import { RightPanel, type RightPanelTab } from "./right-panel";
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

// Right panel tab icons
const rightTabIcons: Array<{ id: RightPanelTab; icon: typeof MessageSquare }> = [
  { id: "comments", icon: MessageSquare },
  { id: "chat", icon: MessageCircle },
  { id: "context", icon: Pin },
  { id: "analysis", icon: BarChart3 },
  { id: "activity", icon: Activity },
];

// Collapsed left sidebar — shows only mode icons
function CollapsedSidebar({
  workspaceMode,
  onIconClick,
  isSeries,
}: {
  workspaceMode: WorkspaceMode;
  onIconClick: (mode: WorkspaceMode) => void;
  isSeries: boolean;
}) {
  const t = useTranslations("Sidebar");
  const items = isSeries
    ? navItemsConfig.filter((item) => item.mode !== "script")
    : navItemsConfig;

  return (
    <div className="flex h-full flex-col items-center py-3 gap-0.5">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onIconClick(item.mode)}
          className={`rounded-md p-2 transition-colors ${
            workspaceMode === item.mode
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
          title={t(item.tKey)}
        >
          <item.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

// Collapsed right panel — shows only tab icons
function CollapsedRightBar({
  onIconClick,
}: {
  onIconClick: (tab: RightPanelTab) => void;
}) {
  const t = useTranslations("RightPanel");
  return (
    <div className="flex h-full flex-col items-center py-3 gap-0.5">
      {rightTabIcons.map((item) => (
        <button
          key={item.id}
          onClick={() => onIconClick(item.id)}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={t(item.id)}
        >
          <item.icon className="h-4 w-4" />
        </button>
      ))}
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
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<RightPanelTab>("comments");
  const isSeries = project.type === "TV_SERIES";

  // Auto-collapse right panel on tablets
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const handle = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches && rightPanelRef.current) {
        rightPanelRef.current.collapse();
      }
    };
    handle(mq);
    mq.addEventListener("change", handle);
    return () => mq.removeEventListener("change", handle);
  }, []);

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

  // Close mobile overlays on Escape
  useEffect(() => {
    if (!mobileSidebarOpen && !mobileRightOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileSidebarOpen(false);
        setMobileRightOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mobileSidebarOpen, mobileRightOpen]);

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
            <EntitiesPanel projectId={project.id} defaultTab="characters" editor={editor} hideTabs />
          </Suspense>
        );
      case "locations":
        return (
          <Suspense fallback={<PanelFallback />}>
            <EntitiesPanel projectId={project.id} defaultTab="locations" editor={editor} hideTabs />
          </Suspense>
        );
      case "graph":
        return (
          <Suspense fallback={<PanelFallback />}>
            <KnowledgeGraphPanel projectId={project.id} documentId={document.id} editor={editor} />
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
      onCollapse={() => leftPanelRef.current?.collapse()}
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
        {/* Desktop sidebar — hidden on mobile/tablet */}
        <ResizablePanel
          ref={leftPanelRef}
          defaultSize={15}
          minSize={3}
          maxSize={25}
          collapsible
          collapsedSize={3}
          onCollapse={() => setLeftPanelOpen(false)}
          onExpand={() => setLeftPanelOpen(true)}
          className="glass-panel border-r border-sidebar-border max-lg:hidden"
        >
          {leftPanelOpen ? (
            sidebarContent
          ) : (
            <CollapsedSidebar
              workspaceMode={workspaceMode}
              isSeries={isSeries}
              onIconClick={(mode) => {
                handleModeChange(mode);
                leftPanelRef.current?.expand();
              }}
            />
          )}
        </ResizablePanel>

        <ResizableHandle className="w-px bg-border/50 transition-colors hover:bg-cinema/30 max-lg:hidden" />

        <ResizablePanel defaultSize={rightPanelOpen ? 60 : 85} minSize={40}>
          <div className="relative h-full">
            {/* Mobile hamburger button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="absolute left-2 top-2.5 z-20 rounded-md border border-border bg-background/80 p-1 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            {renderCenterPanel()}
          </div>
        </ResizablePanel>

        <ResizableHandle className="w-px bg-border/50 transition-colors hover:bg-cinema/30 max-lg:hidden" />

        <ResizablePanel
          ref={rightPanelRef}
          defaultSize={25}
          minSize={3}
          maxSize={35}
          collapsible
          collapsedSize={3}
          onCollapse={() => setRightPanelOpen(false)}
          onExpand={() => setRightPanelOpen(true)}
          className="glass-panel border-l border-sidebar-border max-lg:hidden"
        >
          {rightPanelOpen ? (
            <RightPanel
              editor={editor}
              documentId={document.id}
              projectId={project.id}
              activeTab={activeRightTab}
              onTabChange={setActiveRightTab}
              onToggle={() => rightPanelRef.current?.collapse()}
            />
          ) : (
            <CollapsedRightBar
              onIconClick={(tab) => {
                setActiveRightTab(tab);
                rightPanelRef.current?.expand();
              }}
            />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Mobile left sidebar overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 w-72 bg-background shadow-xl lg:hidden"
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

      {/* Mobile right panel overlay */}
      <AnimatePresence>
        {mobileRightOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileRightOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 right-0 z-50 w-80 bg-background shadow-xl lg:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <button
                onClick={() => setMobileRightOpen(false)}
                className="absolute right-2 top-2 z-10 rounded-md p-1 text-muted-foreground hover:text-foreground"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
              <RightPanel
                editor={editor}
                documentId={document.id}
                projectId={project.id}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile FAB for right panel access */}
      <button
        onClick={() => setMobileRightOpen(true)}
        className="fixed bottom-4 right-4 z-30 hidden rounded-full bg-cinema p-3 text-white shadow-lg max-lg:block"
      >
        <MessageCircle className="h-5 w-5" />
      </button>

      <GlobalSearchDialog
        open={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        projectId={project.id}
      />
    </motion.div>
  );
}
