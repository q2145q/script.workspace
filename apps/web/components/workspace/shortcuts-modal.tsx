"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
const mod = isMac ? "⌘" : "Ctrl";

interface Shortcut {
  key: string;
  labelKey: string;
}

interface ShortcutGroup {
  titleKey: string;
  shortcuts: Shortcut[];
}

const groups: ShortcutGroup[] = [
  {
    titleKey: "navigation",
    shortcuts: [
      { key: "Tab", labelKey: "nextBlockType" },
      { key: "Shift+Tab", labelKey: "prevBlockType" },
    ],
  },
  {
    titleKey: "formatting",
    shortcuts: [
      { key: `${mod}+K`, labelKey: "formatSelection" },
      { key: `${mod}+B`, labelKey: "bold" },
      { key: `${mod}+I`, labelKey: "italic" },
    ],
  },
  {
    titleKey: "ai",
    shortcuts: [
      { key: `${mod}+Shift+K`, labelKey: "rewriteSelection" },
      { key: `${mod}+Shift+M`, labelKey: "addComment" },
    ],
  },
  {
    titleKey: "editing",
    shortcuts: [
      { key: "Enter", labelKey: "newBlock" },
      { key: `${mod}+Z`, labelKey: "undo" },
      { key: `${mod}+Shift+Z`, labelKey: "redo" },
      { key: `${mod}+F`, labelKey: "findReplace" },
    ],
  },
  {
    titleKey: "general",
    shortcuts: [
      { key: `${mod}+/`, labelKey: "showShortcuts" },
    ],
  },
];

export function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  const t = useTranslations("Shortcuts");

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background/95 shadow-2xl backdrop-blur-sm"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                {t("title")}
              </h2>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
              {groups.map((group) => (
                <div key={group.titleKey}>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t(group.titleKey)}
                  </h3>
                  <div className="space-y-1">
                    {group.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.labelKey}
                        className="flex items-center justify-between rounded-md px-2 py-1.5"
                      >
                        <span className="text-[12px] text-foreground">
                          {t(shortcut.labelKey)}
                        </span>
                        <div className="flex items-center gap-1">
                          {shortcut.key.split("+").map((k, i) => (
                            <kbd
                              key={i}
                              className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground"
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
