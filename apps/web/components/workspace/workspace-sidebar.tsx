"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, LayoutList, Users, MapPin, StickyNote, History, Settings } from "lucide-react";
import type { Editor } from "@script/editor";
import { SceneNavigator } from "./scene-navigator";
import { ThemeToggle } from "@/components/theme-toggle";

interface WorkspaceSidebarProps {
  project: {
    id: string;
    title: string;
    documents: Array<{ id: string; title: string }>;
  };
  activeDocumentId: string;
  editor: Editor | null;
}

const navItemsConfig = [
  { label: "Script", key: "script", icon: FileText, disabled: false },
  { label: "Outline", key: "outline", icon: LayoutList, disabled: true },
  { label: "Characters", key: "chars", icon: Users, disabled: true },
  { label: "Locations", key: "locs", icon: MapPin, disabled: true },
  { label: "Notes", key: "notes", icon: StickyNote, disabled: true },
  { label: "Versions", key: "vers", icon: History, disabled: true },
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
}: WorkspaceSidebarProps) {
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
              {navItem.disabled ? (
                <span className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground/40 cursor-not-allowed">
                  <navItem.icon className="h-3.5 w-3.5" />
                  {navItem.label}
                  <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium">
                    Soon
                  </span>
                </span>
              ) : (
                <Link
                  href={`/project/${project.id}`}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-all duration-200 hover:bg-accent"
                >
                  <navItem.icon className="h-3.5 w-3.5" />
                  {navItem.label}
                </Link>
              )}
            </motion.div>
          ))}
        </motion.nav>

        {editor && (
          <div className="border-t border-sidebar-border py-2">
            <SceneNavigator editor={editor} />
          </div>
        )}

        {project.documents.length > 0 && (
          <div className="border-t border-sidebar-border p-2">
            <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Documents
            </p>
            {project.documents.map((doc) => (
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
        )}
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
