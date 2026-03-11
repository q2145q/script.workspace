"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { authClient } from "@script/api/auth-client";
import { z } from "zod";

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = z.string().email().safeParse(email);
    if (!result.success) {
      setError(t("validationEmail"));
      return;
    }

    setLoading(true);
    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });
    } catch {
      // Always show success to prevent email enumeration
    }
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="glass-panel rounded-xl border border-border p-8 shadow-lg"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cinema/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-cinema"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            {t("passwordResetRequest")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("passwordResetRequestDescription")}
          </p>
          <p className="mt-4">
            <Link
              href="/sign-in"
              className="text-sm text-cinema transition-colors hover:underline"
            >
              {t("backToSignIn")}
            </Link>
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="glass-panel rounded-xl border border-border p-8 shadow-lg"
    >
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          {t("forgotPassword")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("forgotPasswordDescription")}
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
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={t("emailPlaceholder")}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-cinema px-3 py-2.5 text-sm font-medium text-cinema-foreground transition-all duration-200 hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "..." : t("resetPassword")}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link
          href="/sign-in"
          className="text-cinema transition-colors hover:underline"
        >
          {t("backToSignIn")}
        </Link>
      </p>
    </motion.div>
  );
}
