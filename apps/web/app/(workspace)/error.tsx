"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors");

  useEffect(() => {
    console.error("Workspace error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          {t("editorError")}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {t("workspaceError")}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t("tryAgain")}
          </button>
          <Link
            href="/dashboard"
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
          >
            {t("backToDashboard")}
          </Link>
        </div>
      </div>
    </div>
  );
}
