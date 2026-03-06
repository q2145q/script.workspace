"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal, Pencil, Copy, Trash2, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";

export interface DocumentMenuActions {
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

interface DocumentContextMenuProps {
  children: ReactNode;
  actions: DocumentMenuActions;
}

export function DocumentContextMenu({ children, actions }: DocumentContextMenuProps) {
  const t = useTranslations("Document");

  return (
    <DropdownMenu.Root>
      <div className="group relative flex items-center">
        {children}
        <DropdownMenu.Trigger asChild>
          <button
            className="absolute right-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
        </DropdownMenu.Trigger>
      </div>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[160px] rounded-md border border-border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
          sideOffset={4}
          align="start"
        >
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-popover-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent"
            onSelect={actions.onRename}
          >
            <Pencil className="h-3 w-3" />
            {t("rename")}
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-popover-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent"
            onSelect={actions.onDuplicate}
          >
            <Copy className="h-3 w-3" />
            {t("duplicate")}
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-destructive outline-none transition-colors hover:bg-destructive/10 focus:bg-destructive/10"
            onSelect={actions.onDelete}
          >
            <Trash2 className="h-3 w-3" />
            {t("delete")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
