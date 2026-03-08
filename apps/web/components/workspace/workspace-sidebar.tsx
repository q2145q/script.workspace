"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  FileText, LayoutList, Users, MapPin, BookOpen, History,
  Settings, Network, Presentation, StickyNote, Plus, Check, X, Kanban,
} from "lucide-react";
import type { Editor } from "@script/editor";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SceneNavigator } from "./scene-navigator";
import { EpisodeNavigator } from "./episode-navigator";
import { ThemeToggle } from "@/components/theme-toggle";
import { ReportButton } from "./report-button";
import { DocumentContextMenu } from "./document-context-menu";
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
  tKey: string;
  key: string;
  icon: typeof FileText;
  mode: WorkspaceMode;
}> = [
  { tKey: "script", key: "script", icon: FileText, mode: "script" },
  { tKey: "bible", key: "bible", icon: BookOpen, mode: "bible" },
  { tKey: "outline", key: "outline", icon: LayoutList, mode: "outline" },
  { tKey: "characters", key: "chars", icon: Users, mode: "characters" },
  { tKey: "locations", key: "locs", icon: MapPin, mode: "locations" },
  { tKey: "sceneBoard", key: "board", icon: Kanban, mode: "scene-board" },
  { tKey: "onePager", key: "pager", icon: Presentation, mode: "one-pager" },
  { tKey: "notes", key: "notes", icon: StickyNote, mode: "notes" },
  { tKey: "versions", key: "vers", icon: History, mode: "versions" },
  { tKey: "graph", key: "graph", icon: Network, mode: "graph" },
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
  const t = useTranslations("Sidebar");
  const tDoc = useTranslations("Document");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isSeries = project.type === "TV_SERIES";

  // Client-side document list (overrides server-loaded data for live updates)
  const { data: documents } = useQuery({
    ...trpc.document.list.queryOptions({ projectId: project.id }),
    initialData: project.documents.map((d, i) => ({
      id: d.id,
      title: d.title,
      sortOrder: i,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  });

  // Mutations
  const createMutation = useMutation(
    trpc.document.create.mutationOptions({
      onSuccess: (doc) => {
        queryClient.invalidateQueries({ queryKey: trpc.document.list.queryKey({ projectId: project.id }) });
        toast.success(tDoc("created"));
        router.push(`/project/${project.id}/script/${doc.id}`);
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const renameMutation = useMutation(
    trpc.document.rename.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.document.list.queryKey({ projectId: project.id }) });
        queryClient.invalidateQueries({ queryKey: trpc.project.getById.queryKey({ id: project.id }) });
        toast.success(tDoc("renamed"));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const deleteMutation = useMutation(
    trpc.document.delete.mutationOptions({
      onSuccess: (_data, vars) => {
        queryClient.invalidateQueries({ queryKey: trpc.document.list.queryKey({ projectId: project.id }) });
        queryClient.invalidateQueries({ queryKey: trpc.project.getById.queryKey({ id: project.id }) });
        toast.success(tDoc("deleted"));
        // If deleted the active document, navigate to first remaining
        if (vars.id === activeDocumentId && documents) {
          const remaining = documents.filter((d) => d.id !== vars.id);
          if (remaining.length > 0) {
            router.push(`/project/${project.id}/script/${remaining[0].id}`);
          }
        }
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const duplicateMutation = useMutation(
    trpc.document.duplicate.mutationOptions({
      onSuccess: (doc) => {
        queryClient.invalidateQueries({ queryKey: trpc.document.list.queryKey({ projectId: project.id }) });
        toast.success(tDoc("duplicated"));
        router.push(`/project/${project.id}/script/${doc.id}`);
      },
      onError: (err) => toast.error(err.message),
    })
  );

  // Inline rename state
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  const startRename = (docId: string, currentTitle: string) => {
    setRenamingDocId(docId);
    setRenameTitle(currentTitle);
  };

  const confirmRename = () => {
    if (renamingDocId && renameTitle.trim()) {
      renameMutation.mutate({ id: renamingDocId, title: renameTitle.trim() });
    }
    setRenamingDocId(null);
  };

  const cancelRename = () => {
    setRenamingDocId(null);
  };

  // Filter documents for display
  const episodeDocIds = new Set(
    (project.episodes ?? []).map((ep) => ep.document.id)
  );
  const docsToShow = documents
    ? (isSeries
        ? documents.filter((d) => !episodeDocIds.has(d.id))
        : documents)
    : [];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-sidebar-border px-4 py-3">
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          &larr; {tCommon("back")}
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
                {t(navItem.tKey)}
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

        {/* Documents section */}
        <div className="border-t border-sidebar-border p-2">
          <div className="flex items-center justify-between px-3 py-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("documents")}
            </p>
            <button
              onClick={() => createMutation.mutate({ projectId: project.id })}
              disabled={createMutation.isPending}
              className="flex items-center justify-center rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={tDoc("newDocument")}
              aria-label={tDoc("newDocument")}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {docsToShow.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {tDoc("noDocuments")}
            </p>
          ) : (
            docsToShow.map((doc) => (
              <DocumentItem
                key={doc.id}
                doc={doc}
                projectId={project.id}
                isActive={doc.id === activeDocumentId}
                isRenaming={doc.id === renamingDocId}
                renameTitle={renameTitle}
                onRenameChange={setRenameTitle}
                onRenameConfirm={confirmRename}
                onRenameCancel={cancelRename}
                onStartRename={() => startRename(doc.id, doc.title)}
                onDuplicate={() => duplicateMutation.mutate({ id: doc.id })}
                onDelete={() => {
                  if (confirm(tDoc("confirmDelete"))) {
                    deleteMutation.mutate({ id: doc.id });
                  }
                }}
                onNavigate={() => onModeChange("script")}
              />
            ))
          )}
        </div>
      </div>

      {/* Fixed bottom section — always visible */}
      <div className="shrink-0 border-t border-sidebar-border p-2">
        <Link
          href={`/project/${project.id}/settings`}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground"
        >
          <Settings className="h-3.5 w-3.5" />
          {t("settings")}
        </Link>
        <ReportButton />
      </div>

      <div className="shrink-0 flex items-center justify-between border-t border-sidebar-border px-3 py-2">
        <span className="text-[10px] text-muted-foreground">{t("theme")}</span>
        <ThemeToggle />
      </div>
    </div>
  );
}

/** Single document item with context menu and inline rename */
function DocumentItem({
  doc,
  projectId,
  isActive,
  isRenaming,
  renameTitle,
  onRenameChange,
  onRenameConfirm,
  onRenameCancel,
  onStartRename,
  onDuplicate,
  onDelete,
  onNavigate,
}: {
  doc: { id: string; title: string };
  projectId: string;
  isActive: boolean;
  isRenaming: boolean;
  renameTitle: string;
  onRenameChange: (title: string) => void;
  onRenameConfirm: () => void;
  onRenameCancel: () => void;
  onStartRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onNavigate: () => void;
}) {
  const tDoc = useTranslations("Document");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  if (isRenaming) {
    return (
      <div className="flex items-center gap-1 rounded-md bg-accent px-2 py-1">
        <input
          ref={inputRef}
          value={renameTitle}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onRenameConfirm();
            if (e.key === "Escape") onRenameCancel();
          }}
          onBlur={onRenameConfirm}
          className="min-w-0 flex-1 rounded bg-background px-1.5 py-0.5 text-xs focus:outline-none"
        />
        <button
          onClick={onRenameConfirm}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={tDoc("confirmRename")}
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          onClick={onRenameCancel}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={tDoc("cancelRename")}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <DocumentContextMenu
      actions={{
        onRename: onStartRename,
        onDuplicate,
        onDelete,
      }}
    >
      <Link
        href={`/project/${projectId}/script/${doc.id}`}
        onClick={onNavigate}
        className={`flex w-full items-center rounded-md px-3 py-1.5 pr-7 text-sm transition-all duration-200 ${
          isActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
      >
        <span className="truncate">{doc.title}</span>
      </Link>
    </DocumentContextMenu>
  );
}
