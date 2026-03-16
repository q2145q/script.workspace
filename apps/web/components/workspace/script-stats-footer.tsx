"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useLocale } from "next-intl";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ScriptStats } from "@script/editor";

interface ScriptStatsFooterProps {
  stats: ScriptStats;
}

export function ScriptStatsFooter({ stats }: ScriptStatsFooterProps) {
  const t = useTranslations("Stats");
  const tc = useTranslations("Common");
  const [expanded, setExpanded] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  const locale = useLocale();

  // Compute fixed position when expanded (useLayoutEffect to avoid flicker)
  useLayoutEffect(() => {
    if (!expanded || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPopoverStyle({
      position: "fixed",
      bottom: window.innerHeight - rect.top + 4,
      left: rect.left,
      width: Math.max(rect.width, 240),
      zIndex: 20,
    });
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setExpanded(false);
      }
    };
    const timer = setTimeout(() => window.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousedown", handler);
    };
  }, [expanded]);

  if (stats.wordCount === 0) return null;

  const formattedWords = stats.wordCount.toLocaleString(locale);

  // Top characters by dialogue words (max 5)
  const topCharacters = Array.from(stats.characterDialogueMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxDialogueWords = topCharacters[0]?.[1] || 1;

  return (
    <div>
      {expanded && createPortal(
        <AnimatePresence>
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            style={popoverStyle}
            className="rounded-lg border border-border bg-background/95 p-3 shadow-xl backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-foreground">
                {t("title")}
              </span>
              <button
                onClick={() => setExpanded(false)}
                aria-label={tc("close")}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-md bg-muted/30 p-2">
                <div className="text-muted-foreground">{t("pages")}</div>
                <div className="text-lg font-semibold text-foreground">{stats.pageCount}</div>
              </div>
              <div className="rounded-md bg-muted/30 p-2">
                <div className="text-muted-foreground">{t("words")}</div>
                <div className="text-lg font-semibold text-foreground">{formattedWords}</div>
              </div>
              <div className="rounded-md bg-muted/30 p-2">
                <div className="text-muted-foreground">{t("scenes")}</div>
                <div className="text-lg font-semibold text-foreground">{stats.sceneCount}</div>
              </div>
              <div className="rounded-md bg-muted/30 p-2">
                <div className="text-muted-foreground">{t("characters")}</div>
                <div className="text-lg font-semibold text-foreground">{stats.characterCount}</div>
              </div>
            </div>

            <div className="mt-2 rounded-md bg-muted/30 p-2">
              <div className="text-[10px] text-muted-foreground">{t("estimatedTime")}</div>
              <div className="text-sm font-semibold text-foreground">
                ~{stats.estimatedMinutes} {t("minutes")}
              </div>
            </div>

            {topCharacters.length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("distribution")}
                </div>
                <div className="space-y-1">
                  {topCharacters.map(([name, words]) => (
                    <div key={name} className="flex items-center gap-2 text-[10px]">
                      <span className="w-20 truncate text-foreground font-medium">{name}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-cinema/60"
                          style={{ width: `${(words / maxDialogueWords) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-muted-foreground">{words}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      <button
        ref={buttonRef}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-center gap-3 border-t border-border bg-background/80 px-4 py-1.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
      >
        <span>{stats.pageCount} {t("pagesShort")}</span>
        <span className="text-border">·</span>
        <span>{formattedWords} {t("wordsShort")}</span>
        <span className="text-border">·</span>
        <span>{stats.sceneCount} {t("scenesShort")}</span>
        <ChevronUp className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}
