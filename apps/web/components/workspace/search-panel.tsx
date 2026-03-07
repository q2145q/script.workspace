"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, ChevronUp, ChevronDown, CaseSensitive, Regex, Replace, ReplaceAll } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Editor } from "@script/editor";
import { searchReplacePluginKey, useEditorState } from "@script/editor";

interface SearchPanelProps {
  editor: Editor;
  onClose: () => void;
}

export function SearchPanel({ editor, onClose }: SearchPanelProps) {
  const t = useTranslations("Search");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);

  const searchState = useEditorState({
    editor,
    selector: (ctx: { editor: Editor }) => {
      const state = searchReplacePluginKey.getState(ctx.editor.state) as {
        matches: Array<{ from: number; to: number }>;
        activeIndex: number;
      } | undefined;
      return {
        matchCount: state?.matches.length ?? 0,
        activeIndex: state?.activeIndex ?? -1,
      };
    },
  });

  // Auto-focus search input
  useEffect(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  // Update search when query/options change
  useEffect(() => {
    editor.commands.setSearchQuery(query);
  }, [editor, query]);

  useEffect(() => {
    editor.commands.setSearchOptions({ caseSensitive, regex: useRegex });
  }, [editor, caseSensitive, useRegex]);

  const handleClose = useCallback(() => {
    editor.commands.clearSearch();
    onClose();
  }, [editor, onClose]);

  // Handle keyboard shortcuts in the panel
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        editor.commands.nextSearchMatch();
      } else if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        editor.commands.prevSearchMatch();
      }
    },
    [editor, handleClose]
  );

  const matchDisplay = searchState.matchCount > 0
    ? t("matchCount", { current: searchState.activeIndex + 1, total: searchState.matchCount })
    : query
      ? t("noResults")
      : "";

  return (
    <div className="glass-panel flex items-center gap-2 border-b border-border px-3 py-1.5">
      {/* Search input */}
      <div className="flex flex-1 items-center gap-1">
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("find")}
          className="w-40 rounded border border-border bg-muted/50 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />

        {/* Toggle buttons */}
        <button
          onClick={() => setCaseSensitive(!caseSensitive)}
          className={`rounded p-1 text-xs transition-colors ${
            caseSensitive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          title={t("caseSensitive")}
          aria-label={t("caseSensitive")}
        >
          <CaseSensitive className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setUseRegex(!useRegex)}
          className={`rounded p-1 text-xs transition-colors ${
            useRegex ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          title={t("regex")}
          aria-label={t("regex")}
        >
          <Regex className="h-3.5 w-3.5" />
        </button>

        {/* Match count */}
        <span className="min-w-[60px] text-center text-[10px] text-muted-foreground">
          {matchDisplay}
        </span>

        {/* Navigation */}
        <button
          onClick={() => editor.commands.prevSearchMatch()}
          disabled={searchState.matchCount === 0}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
          aria-label={t("previousMatch")}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => editor.commands.nextSearchMatch()}
          disabled={searchState.matchCount === 0}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
          aria-label={t("nextMatch")}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Replace input */}
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={replaceText}
          onChange={(e) => setReplaceText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("replace")}
          className="w-32 rounded border border-border bg-muted/50 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={() => editor.commands.replaceCurrentMatch(replaceText)}
          disabled={searchState.matchCount === 0}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
          title={t("replace")}
          aria-label={t("replace")}
        >
          <Replace className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => editor.commands.replaceAllMatches(replaceText)}
          disabled={searchState.matchCount === 0}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
          title={t("replaceAll")}
          aria-label={t("replaceAll")}
        >
          <ReplaceAll className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Close */}
      <button
        onClick={handleClose}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={t("close")}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
