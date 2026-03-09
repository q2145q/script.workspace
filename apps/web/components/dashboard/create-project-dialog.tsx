"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Film, Tv, Clapperboard } from "lucide-react";
import { z } from "zod";

const createProjectSchema = z.object({
  title: z.string().min(1).max(255),
});

interface ProjectTemplate {
  id: string;
  icon: typeof Film;
  titleKey: string;
  descKey: string;
  type: "FEATURE_FILM" | "TV_SERIES" | "SHORT_FILM";
  defaultTitle: string;
}

const TEMPLATES: ProjectTemplate[] = [
  {
    id: "feature",
    icon: Film,
    titleKey: "templateFeature",
    descKey: "templateFeatureDesc",
    type: "FEATURE_FILM",
    defaultTitle: "Feature Film",
  },
  {
    id: "series",
    icon: Tv,
    titleKey: "templateSeries",
    descKey: "templateSeriesDesc",
    type: "TV_SERIES",
    defaultTitle: "TV Series",
  },
  {
    id: "short",
    icon: Clapperboard,
    titleKey: "templateShort",
    descKey: "templateShortDesc",
    type: "SHORT_FILM",
    defaultTitle: "Short Film",
  },
];

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"blank" | "template">("blank");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("FEATURE_FILM");
  const [titleError, setTitleError] = useState("");
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
        className="rounded-lg bg-cinema px-4 py-2 text-sm font-medium text-cinema-foreground transition-all duration-200 hover:opacity-90"
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

            {/* Tabs */}
            <div className="mb-4 flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setTab("blank")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === "blank"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("blankProject")}
              </button>
              <button
                type="button"
                onClick={() => setTab("template")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === "template"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("fromTemplate")}
              </button>
            </div>

            {tab === "blank" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setTitleError("");
                  const result = createProjectSchema.safeParse({ title });
                  if (!result.success) {
                    setTitleError(t("validationTitle"));
                    return;
                  }
                  createMutation.mutate({
                    title,
                    description: description || undefined,
                    type: type as "FEATURE_FILM" | "TV_SERIES" | "SHORT_FILM" | "OTHER",
                  });
                }}
                className="space-y-4"
                noValidate
              >
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">{t("projectTitle")}</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setTitleError(""); }}
                    className={`w-full rounded-lg border ${titleError ? "border-destructive" : "border-border"} bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring`}
                    placeholder={t("projectTitlePlaceholder")}
                  />
                  {titleError && (
                    <p className="mt-1 text-xs text-destructive">{titleError}</p>
                  )}
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
                    className="rounded-lg bg-cinema px-4 py-2 text-sm font-medium text-cinema-foreground transition-all duration-200 hover:opacity-90 disabled:opacity-50"
                  >
                    {createMutation.isPending ? t("creating") : tCommon("create")}
                  </button>
                </div>
              </form>
            ) : (
              /* Template tab */
              <div className="space-y-3">
                {TEMPLATES.map((tpl) => {
                  const Icon = tpl.icon;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => {
                        createMutation.mutate({
                          title: t(tpl.titleKey),
                          type: tpl.type,
                        });
                      }}
                      disabled={createMutation.isPending}
                      className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cinema/10">
                        <Icon className="h-5 w-5 text-cinema" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{t(tpl.titleKey)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{t(tpl.descKey)}</p>
                      </div>
                    </button>
                  );
                })}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors duration-200 hover:bg-muted"
                  >
                    {tCommon("cancel")}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
