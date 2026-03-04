"use client";

import Link from "next/link";
import type { Editor } from "@script/editor";
import { SceneNavigator } from "./scene-navigator";

interface WorkspaceSidebarProps {
  project: {
    id: string;
    title: string;
    documents: Array<{ id: string; title: string }>;
  };
  activeDocumentId: string;
  editor: Editor | null;
}

export function WorkspaceSidebar({
  project,
  activeDocumentId,
  editor,
}: WorkspaceSidebarProps) {
  const navItems = [
    { label: "Script", href: `/project/${project.id}`, icon: "doc" },
    { label: "Outline", href: "#", icon: "outline", disabled: true },
    { label: "Characters", href: "#", icon: "chars", disabled: true },
    { label: "Locations", href: "#", icon: "locs", disabled: true },
    { label: "Notes", href: "#", icon: "notes", disabled: true },
    { label: "Versions", href: "#", icon: "vers", disabled: true },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-sidebar-border px-4 py-3">
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          &larr; Back
        </Link>
        <h2 className="mt-1 truncate text-sm font-semibold">
          {project.title}
        </h2>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <div key={item.label}>
            {item.disabled ? (
              <span className="flex items-center rounded-md px-3 py-2 text-sm text-muted-foreground/50 cursor-not-allowed">
                {item.label}
                <span className="ml-auto text-xs">Soon</span>
              </span>
            ) : (
              <Link
                href={item.href}
                className="flex items-center rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-accent"
              >
                {item.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {editor && (
        <div className="border-t border-sidebar-border py-2">
          <SceneNavigator editor={editor} />
        </div>
      )}

      {project.documents.length > 0 && (
        <div className="border-t border-sidebar-border p-2">
          <p className="px-3 py-1 text-xs font-medium text-muted-foreground">
            Documents
          </p>
          {project.documents.map((doc) => (
            <Link
              key={doc.id}
              href={`/project/${project.id}/script/${doc.id}`}
              className={`flex items-center rounded-md px-3 py-1.5 text-sm ${
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
  );
}
