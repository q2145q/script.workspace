"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

export default function VerifyTelegramPage() {
  return (
    <Suspense>
      <VerifyTelegramContent />
    </Suspense>
  );
}

function VerifyTelegramContent() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const trpc = useTRPC();

  const tokenQuery = useQuery(
    trpc.authVerify.getTelegramToken.queryOptions({ email }, { enabled: !!email }),
  );

  const verifyQuery = useQuery(
    trpc.authVerify.checkVerification.queryOptions(
      { email },
      { refetchInterval: 3000, enabled: !!email },
    ),
  );

  const resendMutation = useMutation(
    trpc.authVerify.resendTelegramVerify.mutationOptions(),
  );

  useEffect(() => {
    if (verifyQuery.data?.verified) {
      router.push("/sign-in?verified=true");
    }
  }, [verifyQuery.data?.verified, router]);

  const token = tokenQuery.data?.token;
  const deepLink =
    token && BOT_USERNAME
      ? `https://t.me/${BOT_USERNAME}?start=v_${token}`
      : null;

  async function handleResend() {
    await resendMutation.mutateAsync({ email });
    tokenQuery.refetch();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="glass-panel rounded-xl border border-border p-8 shadow-lg"
    >
      <div className="mb-6 text-center">
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
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          {t("verifyTelegramTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("verifyTelegramDescription")}
        </p>
        {email && (
          <p className="mt-2 text-sm font-medium text-foreground">{email}</p>
        )}
      </div>

      <div className="space-y-3">
        {deepLink ? (
          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cinema px-3 py-2.5 text-sm font-medium text-cinema-foreground transition-all duration-200 hover:opacity-90"
          >
            {t("openTelegram")}
          </a>
        ) : tokenQuery.isLoading ? (
          <div className="flex w-full items-center justify-center rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
            {t("loading")}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-center text-sm text-muted-foreground">
            <p>{t("tokenNotReady", { defaultMessage: "Ссылка ещё не готова. Нажмите кнопку ниже, чтобы получить ссылку для верификации." })}</p>
          </div>
        )}

        <button
          onClick={handleResend}
          disabled={resendMutation.isPending}
          className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted disabled:opacity-50"
        >
          {resendMutation.isPending ? "..." : t("resendVerification")}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/sign-in"
            className="text-cinema transition-colors hover:underline"
          >
            {t("backToSignIn")}
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
