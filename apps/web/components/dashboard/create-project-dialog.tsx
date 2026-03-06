"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("FEATURE_FILM");
  const t = useTranslations("Dashboard");
  const tTypes = useTranslations("ProjectTypes");
  const tCommon = useTranslations("Common");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const createMutation = useMutation(
    trpc.project.create.mutationOptions({
      onSuccess: (project) => {
        queryClient.invalidateQueries({ queryKey: trpc.project.list.queryKey() });
        toast.success(t("projectCreated"));
        setOpen(false);
        setTitle("");
        setDescription("");
        router.push(`/project/${project.id}`);
      },
      onError: (err) => {
        toast.error(err.message);
      },
    })
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-ai-accent px-4 py-2 text-sm font-medium text-ai-accent-foreground transition-all duration-200 hover:opacity-90"
      >
        {t("newProject")}
      </button>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="glass-panel relative z-10 w-full max-w-md rounded-xl border border-border p-6 shadow-2xl"
          >
            <h2 className="mb-4 text-lg font-semibold text-foreground">{t("newProject")}</h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  title,
                  description: description || undefined,
                  type: type as "FEATURE_FILM" | "TV_SERIES" | "SHORT_FILM" | "OTHER",
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">{t("projectTitle")}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={t("projectTitlePlaceholder")}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  {t("descriptionOptional")}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder={t("descriptionPlaceholder")}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">{t("projectType")}</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="FEATURE_FILM">{tTypes("FEATURE_FILM")}</option>
                  <option value="TV_SERIES">{tTypes("TV_SERIES")}</option>
                  <option value="SHORT_FILM">{tTypes("SHORT_FILM")}</option>
                  <option value="OTHER">{tTypes("OTHER")}</option>
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors duration-200 hover:bg-muted"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-lg bg-ai-accent px-4 py-2 text-sm font-medium text-ai-accent-foreground transition-all duration-200 hover:opacity-90 disabled:opacity-50"
                >
                  {createMutation.isPending ? t("creating") : tCommon("create")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
