"use client";

import { useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Editor, JSONContent } from "@script/editor";

const LINES_PER_PAGE = 56;

const LINE_WEIGHT: Record<string, number> = {
  sceneHeading: 2,
  action: 1,
  character: 1,
  dialogue: 1,
  parenthetical: 1,
  transition: 2,
  shot: 2,
};

const SPACE_BEFORE: Record<string, number> = {
  sceneHeading: 2,
  action: 1,
  character: 1,
  dialogue: 0,
  parenthetical: 0,
  transition: 1,
  shot: 1,
};

interface PageContent {
  nodes: JSONContent[];
  pageNumber: number;
}

function paginateContent(content: JSONContent): PageContent[] {
  const nodes = content.content ?? [];
  const pages: PageContent[] = [];
  let currentPage: JSONContent[] = [];
  let currentLines = 0;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const type = node.type ?? "action";
    const text = extractText(node);
    const spaceBefore = i === 0 ? 0 : (SPACE_BEFORE[type] ?? 1);
    const weight = LINE_WEIGHT[type] ?? 1;
    const textLines = Math.max(1, Math.ceil(text.length / 60));
    const totalLines = spaceBefore + textLines * weight;

    if (currentLines + totalLines > LINES_PER_PAGE && currentPage.length > 0) {
      pages.push({ nodes: currentPage, pageNumber: pages.length + 1 });
      currentPage = [];
      currentLines = 0;
    }

    currentPage.push(node);
    currentLines += totalLines;
  }

  if (currentPage.length > 0) {
    pages.push({ nodes: currentPage, pageNumber: pages.length + 1 });
  }

  if (pages.length === 0) {
    pages.push({ nodes: [], pageNumber: 1 });
  }

  return pages;
}

function extractText(node: JSONContent): string {
  if (!node.content) return "";
  return node.content
    .map((child) => {
      if (child.type === "text") return child.text ?? "";
      return extractText(child);
    })
    .join("");
}

const BLOCK_STYLES: Record<string, string> = {
  sceneHeading: "font-bold uppercase mt-6",
  action: "mt-3",
  character: "mt-3 text-center uppercase ml-[30%]",
  dialogue: "mx-[15%]",
  parenthetical: "mx-[20%] italic",
  transition: "mt-3 text-right uppercase",
  shot: "mt-6 font-bold uppercase",
};

interface PrintPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | null;
}

export function PrintPreviewModal({ open, onOpenChange, editor }: PrintPreviewModalProps) {
  const t = useTranslations("PrintPreview");

  const pages = useMemo(() => {
    if (!editor) return [];
    const content = editor.getJSON();
    return paginateContent(content);
  }, [editor, open]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-background print:bg-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Header — hidden on print */}
          <div className="flex items-center justify-between border-b border-border px-6 py-3 print:hidden">
            <h2 className="text-sm font-medium text-foreground">
              {t("title")}
              <span className="ml-2 text-xs text-muted-foreground">
                {t("pageCount", { count: pages.length })}
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-lg bg-cinema px-3 py-1.5 text-xs font-medium text-cinema-foreground transition-all hover:opacity-90"
              >
                <Printer className="h-3.5 w-3.5" />
                {t("print")}
              </button>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Pages */}
          <div className="flex-1 overflow-y-auto bg-muted/30 py-8 print:bg-white print:py-0">
            <div className="mx-auto flex flex-col items-center gap-8 print:gap-0">
              {pages.map((page) => (
                <div
                  key={page.pageNumber}
                  className="print-preview-page relative bg-white shadow-lg print:shadow-none"
                  style={{
                    width: "8.5in",
                    minHeight: "11in",
                    padding: "1in 1in 1in 1.5in",
                    fontFamily: "'Courier New', Courier, monospace",
                    fontSize: "12pt",
                    lineHeight: "1",
                    pageBreakAfter: "always",
                  }}
                >
                  {/* Page number */}
                  <div
                    className="absolute text-xs text-gray-400 print:text-gray-600"
                    style={{ top: "0.5in", right: "1in" }}
                  >
                    {page.pageNumber}.
                  </div>

                  {page.nodes.map((node, i) => {
                    const type = node.type ?? "action";
                    const text = extractText(node);
                    const className = BLOCK_STYLES[type] ?? "mt-3";
                    const isFirst = i === 0;
                    return (
                      <div
                        key={i}
                        className={isFirst ? className.replace(/mt-\d+/g, "") : className}
                      >
                        {text}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
