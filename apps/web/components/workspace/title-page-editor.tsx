"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { FileText, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface TitlePageEditorProps {
  projectId: string;
}

export function TitlePageEditor({ projectId }: TitlePageEditorProps) {
  const t = useTranslations("TitlePage");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: titlePageData } = useQuery(
    trpc.project.getTitlePage.queryOptions({ projectId })
  );

  const saveMutation = useMutation(
    trpc.project.updateTitlePage.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.project.getTitlePage.queryKey({ projectId }) });
        toast.success(t("saved"));
        setOpen(false);
      },
    })
  );

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    authors: [""],
    contact: "",
    company: "",
    draftDate: "",
    notes: "",
  });

  // Sync form with loaded data
  useEffect(() => {
    if (titlePageData && open) {
      const d = titlePageData as Record<string, unknown>;
      setForm({
        title: String(d.title || ""),
        subtitle: String(d.subtitle || ""),
        authors: Array.isArray(d.authors) && d.authors.length > 0
          ? d.authors.map(String)
          : [""],
        contact: String(d.contact || ""),
        company: String(d.company || ""),
        draftDate: String(d.draftDate || ""),
        notes: String(d.notes || ""),
      });
    }
  }, [titlePageData, open]);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addAuthor = () => {
    setForm((prev) => ({ ...prev, authors: [...prev.authors, ""] }));
  };

  const removeAuthor = (index: number) => {
    setForm((prev) => ({
      ...prev,
      authors: prev.authors.filter((_, i) => i !== index),
    }));
  };

  const updateAuthor = (index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      authors: prev.authors.map((a, i) => (i === index ? value : a)),
    }));
  };

  const handleSave = () => {
    saveMutation.mutate({
      projectId,
      data: {
        ...form,
        authors: form.authors.filter((a) => a.trim() !== ""),
      },
    });
  };

  const inputClass = "w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={t("title")}
      >
        <FileText className="h-3.5 w-3.5" />
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
              onClick={() => !saveMutation.isPending && setOpen(false)}
            />

            {/* Dialog */}
            <motion.div
              className="glass-panel relative z-10 w-full max-w-lg rounded-xl border border-border p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
                <button
                  onClick={() => setOpen(false)}
                  disabled={saveMutation.isPending}
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Title */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("scriptTitle")}</label>
                  <input
                    className={inputClass}
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder={t("scriptTitlePlaceholder")}
                  />
                </div>

                {/* Subtitle */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("subtitle")}</label>
                  <input
                    className={inputClass}
                    value={form.subtitle}
                    onChange={(e) => updateField("subtitle", e.target.value)}
                    placeholder={t("subtitlePlaceholder")}
                  />
                </div>

                {/* Authors */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("authors")}</label>
                  {form.authors.map((author, i) => (
                    <div key={i} className="mb-1 flex items-center gap-1">
                      <input
                        className={inputClass}
                        value={author}
                        onChange={(e) => updateAuthor(i, e.target.value)}
                        placeholder={t("authorPlaceholder")}
                      />
                      {form.authors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAuthor(i)}
                          className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addAuthor}
                    className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" /> {t("addAuthor")}
                  </button>
                </div>

                {/* Company */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("company")}</label>
                  <input
                    className={inputClass}
                    value={form.company}
                    onChange={(e) => updateField("company", e.target.value)}
                    placeholder={t("companyPlaceholder")}
                  />
                </div>

                {/* Contact */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("contact")}</label>
                  <input
                    className={inputClass}
                    value={form.contact}
                    onChange={(e) => updateField("contact", e.target.value)}
                    placeholder={t("contactPlaceholder")}
                  />
                </div>

                {/* Draft Date */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("draftDate")}</label>
                  <input
                    className={inputClass}
                    value={form.draftDate}
                    onChange={(e) => updateField("draftDate", e.target.value)}
                    placeholder={t("draftDatePlaceholder")}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("notes")}</label>
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    placeholder={t("notesPlaceholder")}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-md border border-border px-4 py-1.5 text-sm text-muted-foreground hover:bg-muted"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="rounded-md bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saveMutation.isPending ? t("saving") : t("save")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
