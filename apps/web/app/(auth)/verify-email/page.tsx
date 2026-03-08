"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { authClient } from "@script/api/auth-client";

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const t = useTranslations("Auth");
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleResend() {
    if (!email || loading) return;
    setLoading(true);
    try {
      await authClient.sendVerificationEmail({ email });
      setResent(true);
    } catch {
      // silently fail
    }
    setLoading(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="glass-panel rounded-xl border border-border p-8 shadow-lg"
    >
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ai-accent/10">
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
            className="text-ai-accent"
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          {t("verifyEmailTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("verifyEmailDescription")}
        </p>
        {email && (
          <p className="mt-2 text-sm font-medium text-foreground">{email}</p>
        )}
      </div>

      <div className="space-y-3">
        {resent ? (
          <p className="text-center text-sm text-ai-accent">
            {t("emailSent")}
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={loading || !email}
            className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted disabled:opacity-50"
          >
            {loading ? "..." : t("resendEmail")}
          </button>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/sign-in"
            className="text-ai-accent transition-colors hover:underline"
          >
            {t("backToSignIn")}
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
