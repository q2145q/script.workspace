"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { POSITIONS, LANGUAGES } from "@script/types";
import { useTranslations } from "next-intl";

const inputClass =
  "w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring";

const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

const selectClass =
  "w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring";

export function ProfileSettingsForm() {
  const t = useTranslations("Profile");
  const tPositions = useTranslations("Positions");
  const tCommon = useTranslations("Common");

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery(trpc.user.me.queryOptions());

  const [lastName, setLastName] = useState<string | null>(null);
  const [position, setPosition] = useState<string | null>(null);
  const [company, setCompany] = useState<string | null>(null);
  const [defaultLanguage, setDefaultLanguage] = useState<string | null>(null);

  const updateMutation = useMutation(
    trpc.user.updateProfile.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.user.me.queryKey() });
        toast.success(t("profileUpdated"));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const profile = user.profile;
  const currentLastName = lastName ?? profile.lastName;
  const currentPosition = position ?? profile.position;
  const currentCompany = company ?? profile.company ?? "";
  const currentLanguage = defaultLanguage ?? profile.defaultLanguage;

  const handleSave = () => {
    updateMutation.mutate({
      lastName: currentLastName,
      position: currentPosition,
      company: currentCompany.trim() || null,
      defaultLanguage: currentLanguage,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-8 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
      </div>

      <div className="glass-panel rounded-xl border border-border p-6">
        <div className="space-y-5">
          <div>
            <label className={labelClass}>{t("firstName")}</label>
            <input
              type="text"
              value={user.name}
              disabled
              className={`${inputClass} opacity-60 cursor-not-allowed`}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("nameSetDuringRegistration")}
            </p>
          </div>

          <div>
            <label htmlFor="lastName" className={labelClass}>
              {t("lastName")}
            </label>
            <input
              id="lastName"
              type="text"
              value={currentLastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
              placeholder={t("lastNamePlaceholder")}
            />
          </div>

          <div>
            <label className={labelClass}>{t("email")}</label>
            <input
              type="text"
              value={user.email}
              disabled
              className={`${inputClass} opacity-60 cursor-not-allowed`}
            />
          </div>

          <div>
            <label htmlFor="position" className={labelClass}>
              {t("position")}
            </label>
            <select
              id="position"
              value={currentPosition}
              onChange={(e) => setPosition(e.target.value)}
              className={selectClass}
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {tPositions(p)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="company" className={labelClass}>
              {t("company")} <span className="text-muted-foreground">{tCommon("optional")}</span>
            </label>
            <input
              id="company"
              type="text"
              value={currentCompany}
              onChange={(e) => setCompany(e.target.value)}
              className={inputClass}
              placeholder={t("companyPlaceholder")}
            />
          </div>

          <div>
            <label htmlFor="defaultLanguage" className={labelClass}>
              {t("defaultLanguage")}
            </label>
            <select
              id="defaultLanguage"
              value={currentLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value)}
              className={selectClass}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-ai-accent px-4 py-2 text-sm font-medium text-ai-accent-foreground transition-all duration-200 hover:opacity-90 disabled:opacity-50"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {tCommon("save")}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
