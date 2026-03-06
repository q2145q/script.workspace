"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, LayoutList, Users, MapPin, BookOpen, History, Settings, Network, Presentation, StickyNote } from "lucide-react";
import type { Editor } from "@script/editor";
import { SceneNavigator } from "./scene-navigator";
import { EpisodeNavigator } from "./episode-navigator";
import { ThemeToggle } from "@/components/theme-toggle";
import type { WorkspaceMode } from "./workspace-shell";

interface WorkspaceSidebarProps {
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
  activeDocumentId: string;
  editor: Editor | null;
  workspaceMode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
}

const navItemsConfig: Array<{
  label: string;
  key: string;
  icon: typeof FileText;
  mode: WorkspaceMode;
}> = [
  { label: "Script", key: "script", icon: FileText, mode: "script" },
  { label: "Bible", key: "bible", icon: BookOpen, mode: "bible" },
  { label: "Outline", key: "outline", icon: LayoutList, mode: "outline" },
  { label: "Characters", key: "chars", icon: Users, mode: "characters" },
  { label: "Locations", key: "locs", icon: MapPin, mode: "locations" },
  { label: "One Pager", key: "pager", icon: Presentation, mode: "one-pager" },
  { label: "Notes", key: "notes", icon: StickyNote, mode: "notes" },
  { label: "Versions", key: "vers", icon: History, mode: "versions" },
  { label: "Graph", key: "graph", icon: Network, mode: "graph" },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariant = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0 },
};

export function WorkspaceSidebar({
  project,
  activeDocumentId,
  editor,
  workspaceMode,
  onModeChange,
}: WorkspaceSidebarProps) {
  const isSeries = project.type === "TV_SERIES";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-sidebar-border px-4 py-3">
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          &larr; Back
        </Link>
        <h2 className="mt-1 truncate text-sm font-semibold text-sidebar-foreground">
          {project.title}
        </h2>
      </div>

      {/* Scrollable middle section */}
      <div className="flex-1 overflow-y-auto">
        <motion.nav
          className="space-y-0.5 p-2"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {navItemsConfig.map((navItem) => (
            <motion.div key={navItem.key} variants={itemVariant}>
              <button
                onClick={() => onModeChange(navItem.mode)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-all duration-200 ${
                  workspaceMode === navItem.mode
                    ? "bg-accent text-accent-foreground"
                    : "text-sidebar-foreground hover:bg-accent"
                }`}
              >
                <navItem.icon className="h-3.5 w-3.5" />
                {navItem.label}
              </button>
            </motion.div>
          ))}
        </motion.nav>

        {editor && workspaceMode === "script" && (
          <div className="border-t border-sidebar-border py-2">
            <SceneNavigator editor={editor} />
          </div>
        )}

        {isSeries && (
          <EpisodeNavigator
            projectId={project.id}
            activeDocumentId={activeDocumentId}
          />
        )}

        {(() => {
          // For series: show docs not linked to any episode
          // For non-series: show all docs
          const episodeDocIds = new Set(
            (project.episodes ?? []).map((ep) => ep.document.id)
          );
          const docsToShow = isSeries
            ? project.documents.filter((d) => !episodeDocIds.has(d.id))
            : project.documents;

          if (docsToShow.length === 0) return null;

          return (
            <div className="border-t border-sidebar-border p-2">
              <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Documents
              </p>
              {docsToShow.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/project/${project.id}/script/${doc.id}`}
                  className={`flex items-center rounded-md px-3 py-1.5 text-sm transition-all duration-200 ${
                    doc.id === activeDocumentId
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {doc.title}
                </Link>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Fixed bottom section — always visible */}
      <div className="shrink-0 border-t border-sidebar-border p-2">
        <Link
          href={`/project/${project.id}/settings`}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground"
        >
          <Settings className="h-3.5 w-3.5" />
          Settings
        </Link>
      </div>

      <div className="shrink-0 flex items-center justify-between border-t border-sidebar-border px-3 py-2">
        <span className="text-[10px] text-muted-foreground">Theme</span>
        <ThemeToggle />
      </div>
    </div>
  );
}
