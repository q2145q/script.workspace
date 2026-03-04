"use client";

import { useState } from "react";

type Tab = "comments" | "ai" | "context";

export function RightPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("comments");

  const tabs: { id: Tab; label: string }[] = [
    { id: "comments", label: "Comments" },
    { id: "ai", label: "AI Chat" },
    { id: "context", label: "Context" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-sidebar-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">
          {activeTab === "comments" && "Comments will be available in Phase 3"}
          {activeTab === "ai" && "AI Chat will be available in Phase 5"}
          {activeTab === "context" && "Context Pins will be available in Phase 5"}
        </p>
      </div>
    </div>
  );
}
