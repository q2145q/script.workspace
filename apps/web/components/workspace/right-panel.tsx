"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelRightClose } from "lucide-react";
import type { Editor } from "@script/editor";
import { CommentsPanel } from "./comments-panel";
import { ChatPanel } from "./chat-panel";
import { ContextPinsPanel } from "./context-pins-panel";
import { AnalysisPanel } from "./analysis-panel";
import { ActivityPanel } from "./activity-panel";

type Tab = "comments" | "chat" | "context" | "analysis" | "activity";

interface RightPanelProps {
  editor: Editor | null;
  documentId: string;
  projectId: string;
  onToggle?: () => void;
}

export function RightPanel({ editor, documentId, projectId, onToggle }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("comments");

  const tabs: { id: Tab; label: string }[] = [
    { id: "comments", label: "Comments" },
    { id: "chat", label: "Chat" },
    { id: "context", label: "Context" },
    { id: "analysis", label: "Analysis" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex border-b border-sidebar-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 px-2 py-2.5 text-xs font-medium transition-colors duration-200 ${
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
        {onToggle && (
          <button
            onClick={onToggle}
            className="flex items-center px-1.5 py-2.5 text-muted-foreground transition-colors hover:text-foreground"
            title="Hide panel"
          >
            <PanelRightClose className="h-3.5 w-3.5" />
          </button>
        )}
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
            {activeTab === "chat" && (
              <ChatPanel
                editor={editor}
                documentId={documentId}
                projectId={projectId}
              />
            )}
            {activeTab === "context" && (
              <ContextPinsPanel projectId={projectId} />
            )}
            {activeTab === "analysis" && (
              <AnalysisPanel editor={editor} projectId={projectId} />
            )}
            {activeTab === "activity" && (
              <ActivityPanel projectId={projectId} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
