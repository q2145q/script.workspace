"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Editor } from "@script/editor";
import { CommentsPanel } from "./comments-panel";
import { SuggestionPreview } from "./suggestion-preview";
import { SuggestionHistory } from "./suggestion-history";

type Tab = "comments" | "ai" | "context";

interface RightPanelProps {
  editor: Editor | null;
  documentId: string;
}

export function RightPanel({ editor, documentId }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("comments");

  const tabs: { id: Tab; label: string }[] = [
    { id: "comments", label: "Comments" },
    { id: "ai", label: "AI" },
    { id: "context", label: "Context" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex border-b border-sidebar-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 px-3 py-2.5 text-xs font-medium transition-colors duration-200 ${
              activeTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-ai-accent/60 via-ai-accent to-ai-accent/60"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {activeTab === "comments" && (
              <CommentsPanel editor={editor} documentId={documentId} />
            )}
            {activeTab === "ai" && (
              <div className="flex h-full flex-col">
                <div className="border-b border-border px-3 py-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Suggestions
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <SuggestionPreview editor={editor} documentId={documentId} />
                  <SuggestionHistory documentId={documentId} />
                  <div className="p-3 text-center text-[10px] text-muted-foreground">
                    Select text and press <kbd className="rounded border border-border px-1 py-0.5">⌘K</kbd> to rewrite with AI
                  </div>
                </div>
              </div>
            )}
            {activeTab === "context" && (
              <div className="flex h-full items-center justify-center p-4">
                <p className="text-sm text-muted-foreground">
                  Context Pins will be available in Phase 5
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
