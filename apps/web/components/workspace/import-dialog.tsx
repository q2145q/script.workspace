"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, Loader2, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseFountain, decodeFountainFile, type JSONContent, type Editor } from "@script/editor";

interface ImportDialogProps {
  editor: Editor | null;
}

export function ImportDialog({ editor }: ImportDialogProps) {
  const t = useTranslations("Import");
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<JSONContent | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const text = decodeFountainFile(buffer);
      const content = parseFountain(text);
      setPreview(content);
      setFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleImport = useCallback(() => {
    if (!editor || !preview) return;
    editor.commands.setContent(preview);
    setOpen(false);
    setPreview(null);
    setFileName(null);
  }, [editor, preview]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setPreview(null);
    setFileName(null);
    setError(null);
  }, []);

  const nodeCount = preview?.content?.length ?? 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-ai-accent/10 hover:text-ai-accent"
        title={t("importFountain")}
      >
        <Upload className="h-3 w-3" />
        {t("import")}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={handleClose}
            />
            <motion.div
              className="glass-panel relative z-10 w-full max-w-md rounded-xl border border-border p-6 shadow-2xl"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15 }}
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  {t("title")}
                </h2>
                <button
                  onClick={handleClose}
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {!preview ? (
                <div
                  className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                    dragging
                      ? "border-ai-accent bg-ai-accent/5"
                      : "border-border"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                >
                  {loading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
                      <p className="mb-1 text-sm text-foreground">
                        {t("dropHere")}
                      </p>
                      <p className="mb-3 text-xs text-muted-foreground">
                        {t("supportedFormats")}
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg bg-muted px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
                      >
                        {t("chooseFile")}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".fountain,.txt"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </>
                  )}

                  {error && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-red-500">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {error}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <FileText className="h-4 w-4 text-ai-accent" />
                      {fileName}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("blocksFound", { count: nodeCount })}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {t("replaceWarning")}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setPreview(null);
                        setFileName(null);
                      }}
                      className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
                    >
                      {t("chooseAnother")}
                    </button>
                    <button
                      onClick={handleImport}
                      className="flex-1 rounded-lg bg-ai-accent px-4 py-2 text-sm font-medium text-ai-accent-foreground transition-all hover:opacity-90"
                    >
                      {t("importButton")}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
