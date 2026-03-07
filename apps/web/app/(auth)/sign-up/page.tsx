"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { signUp } from "@script/api/auth-client";
import { POSITIONS, LANGUAGES } from "@script/types";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";

const signUpSchema = z.object({
  name: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const inputClass =
  "w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring";

const inputErrorClass =
  "w-full rounded-lg border border-destructive bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring";

const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

const selectClass =
  "w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring";

export default function SignUpPage() {
  const router = useRouter();
  const t = useTranslations("Auth");
  const tCommon = useTranslations("Common");
  const tPos = useTranslations("Positions");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [position, setPosition] = useState("Writer");
  const [company, setCompany] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const trpc = useTRPC();
  const profileMutation = useMutation(trpc.user.updateProfile.mutationOptions());

  function clearFieldError(field: string) {
    setFieldErrors((p) => ({ ...p, [field]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const result = signUpSchema.safeParse({ name, lastName, email, password });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (field === "name" && !errors.name) errors.name = t("validationName");
        if (field === "lastName" && !errors.lastName) errors.lastName = t("validationLastName");
        if (field === "email" && !errors.email) errors.email = t("validationEmail");
        if (field === "password" && !errors.password) errors.password = t("validationPassword");
      }
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    const { error } = await signUp.email({
      name,
      email,
      password,
    });

    if (error) {
      setError(error.message ?? t("failedSignUp"));
      setLoading(false);
      return;
    }

    try {
      await profileMutation.mutateAsync({
        lastName,
        position,
        company: company.trim() || null,
        defaultLanguage,
      });
    } catch {
      // Profile creation is non-critical — will be created lazily on first access
    }

    router.push("/dashboard");
  }

  const getInputClass = (field: string) => fieldErrors[field] ? inputErrorClass : inputClass;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="glass-panel rounded-xl border border-border p-8 shadow-lg"
    >
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground">{t("createAccount")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("startWriting")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="name" className={labelClass}>
              {t("firstName")}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); clearFieldError("name"); }}
              className={getInputClass("name")}
              placeholder={t("firstNamePlaceholder")}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.name}</p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className={labelClass}>
              {t("lastName")}
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); clearFieldError("lastName"); }}
              className={getInputClass("lastName")}
              placeholder={t("lastNamePlaceholder")}
            />
            {fieldErrors.lastName && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.lastName}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
            className={getInputClass("email")}
            placeholder={t("emailPlaceholder")}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            {t("password")}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
            className={getInputClass("password")}
            placeholder={t("passwordPlaceholder")}
          />
          {fieldErrors.password && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.password}</p>
          )}
        </div>

        <div>
          <label htmlFor="position" className={labelClass}>
            {t("position")}
          </label>
          <select
            id="position"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className={selectClass}
          >
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {tPos(p)}
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
            value={company}
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
            value={defaultLanguage}
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

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-ai-accent px-3 py-2.5 text-sm font-medium text-ai-accent-foreground transition-all duration-200 hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("creatingAccount") : t("createAccount")}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {t("hasAccount")}{" "}
        <Link href="/sign-in" className="text-ai-accent transition-colors hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </motion.div>
  );
}
