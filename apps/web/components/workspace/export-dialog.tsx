"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText, FileIcon, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface ExportDialogProps {
  documentId: string;
  projectTitle: string;
}

export function ExportDialog({ documentId, projectTitle }: ExportDialogProps) {
  const t = useTranslations("Export");

  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"pdf" | "docx">("pdf");
  const [titlePage, setTitlePage] = useState(true);
  const [sceneNumbering, setSceneNumbering] = useState(false);
  const [pageNumbering, setPageNumbering] = useState(true);
  const [paperSize, setPaperSize] = useState<"US_LETTER" | "A4">("US_LETTER");
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState("");

  const trpc = useTRPC();

  const exportMutation = useMutation(
    trpc.export.generate.mutationOptions({
      onSuccess: (result) => {
        const byteCharacters = atob(result.data);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: result.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t("exported", { filename: result.filename }));
        setOpen(false);
      },
      onError: (err) => {
        toast.error(t("exportFailed", { message: err.message }));
      },
    })
  );

  const handleExport = () => {
    exportMutation.mutate({
      documentId,
      format,
      titlePage,
      sceneNumbering,
      pageNumbering,
      paperSize,
      watermark: {
        enabled: watermarkEnabled,
        text: watermarkText,
      },
    });
  };

  const inputClass =
    "w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={t("exportScreenplay")}
      >
        <Download className="h-3.5 w-3.5" />
        {t("export")}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !exportMutation.isPending && setOpen(false)}
            />

            {/* Dialog */}
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
                  onClick={() => setOpen(false)}
                  disabled={exportMutation.isPending}
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Format selector */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    {t("format")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFormat("pdf")}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                        format === "pdf"
                          ? "border-ai-accent bg-ai-accent/10 text-ai-accent"
                          : "border-border text-muted-foreground hover:border-ai-accent/30"
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      PDF
                    </button>
                    <button
                      onClick={() => setFormat("docx")}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                        format === "docx"
                          ? "border-ai-accent bg-ai-accent/10 text-ai-accent"
                          : "border-border text-muted-foreground hover:border-ai-accent/30"
                      }`}
                    >
                      <FileIcon className="h-4 w-4" />
                      DOCX
                    </button>
                  </div>
                </div>

                {/* Toggle options */}
                <div className="space-y-2.5">
                  <ToggleOption
                    label={t("titlePage")}
                    description={t("titlePageDesc")}
                    checked={titlePage}
                    onChange={setTitlePage}
                  />
                  <ToggleOption
                    label={t("sceneNumbering")}
                    description={t("sceneNumberingDesc")}
                    checked={sceneNumbering}
                    onChange={setSceneNumbering}
                  />
                  <ToggleOption
                    label={t("pageNumbering")}
                    description={t("pageNumberingDesc")}
                    checked={pageNumbering}
                    onChange={setPageNumbering}
                  />
                </div>

                {/* Paper size */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    {t("paperSize")}
                  </label>
                  <select
                    value={paperSize}
                    onChange={(e) =>
                      setPaperSize(e.target.value as "US_LETTER" | "A4")
                    }
                    className={inputClass}
                  >
                    <option value="US_LETTER">{t("usLetter")}</option>
                    <option value="A4">{t("a4")}</option>
                  </select>
                </div>

                {/* Watermark (PDF only) */}
                <div>
                  <ToggleOption
                    label={t("watermark")}
                    description={
                      format === "docx"
                        ? t("watermarkPdfOnly")
                        : t("watermarkDesc")
                    }
                    checked={watermarkEnabled}
                    onChange={setWatermarkEnabled}
                    disabled={format === "docx"}
                  />
                  {watermarkEnabled && format === "pdf" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 ml-12"
                    >
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder={t("watermarkPlaceholder")}
                        maxLength={100}
                        className={inputClass}
                      />
                    </motion.div>
                  )}
                </div>

                {/* Export button */}
                <button
                  onClick={handleExport}
                  disabled={exportMutation.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-ai-accent px-4 py-2.5 text-sm font-medium text-ai-accent-foreground transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {exportMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("generating")}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      {t("exportFormat", { format: format.toUpperCase() })}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ToggleOption({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-lg px-2 py-1.5 transition-colors ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/30"
      }`}
    >
      <div className="pt-0.5">
        <div
          className={`flex h-5 w-9 items-center rounded-full transition-colors ${
            checked && !disabled ? "bg-ai-accent" : "bg-muted"
          }`}
          onClick={(e) => {
            if (disabled) {
              e.preventDefault();
              return;
            }
            e.preventDefault();
            onChange(!checked);
          }}
        >
          <div
            className={`h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
              checked && !disabled ? "translate-x-4" : "translate-x-1"
            }`}
          />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </label>
  );
}
