"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors");

  useEffect(() => {
    console.error("Root error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          {t("somethingWentWrong")}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {t("unexpectedError")}
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t("tryAgain")}
        </button>
      </div>
    </div>
  );
}
