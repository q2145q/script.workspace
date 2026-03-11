import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("Errors");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="text-6xl font-bold text-muted-foreground/30">404</div>
        <h1 className="text-xl font-semibold text-foreground">
          {t("notFound")}
        </h1>
        <p className="text-sm text-muted-foreground max-w-md">
          {t("notFoundDescription")}
        </p>
        <Link
          href="/"
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t("goHome")}
        </Link>
      </div>
    </div>
  );
}
