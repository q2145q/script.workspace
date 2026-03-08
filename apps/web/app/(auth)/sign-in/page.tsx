"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { signIn } from "@script/api/auth-client";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export default function SignInPage() {
  const router = useRouter();
  const t = useTranslations("Auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (field === "email") errors.email = t("validationEmail");
        if (field === "password") errors.password = t("validationPassword");
      }
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    const { error } = await signIn.email({
      email,
      password,
    });

    if (error) {
      setError(error.message ?? t("failedSignIn"));
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  const inputClass = (field: string) =>
    `w-full rounded-lg border ${fieldErrors[field] ? "border-destructive" : "border-border"} bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="glass-panel rounded-xl border border-border p-8 shadow-lg"
    >
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground">{t("signIn")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("welcomeBack")}
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

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: "" })); }}
            className={inputClass("email")}
            placeholder={t("emailPlaceholder")}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              {t("password")}
            </label>
            <Link href="/forgot-password" className="text-xs text-ai-accent transition-colors hover:underline">
              {t("forgotPassword")}
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: "" })); }}
            className={inputClass("password")}
            placeholder="••••••••"
          />
          {fieldErrors.password && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-ai-accent px-3 py-2.5 text-sm font-medium text-ai-accent-foreground transition-all duration-200 hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("signingIn") : t("signIn")}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/sign-up" className="text-ai-accent transition-colors hover:underline">
          {t("signUp")}
        </Link>
      </p>
    </motion.div>
  );
}
