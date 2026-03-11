"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useTransition } from "react";
import { Globe } from "lucide-react";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("LocaleSwitcher");

  const nextLocale = locale === "ru" ? "en" : "ru";

  function switchLocale() {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <button
      onClick={switchLocale}
      disabled={isPending}
      className="landing-nav-link flex items-center gap-1.5 text-sm"
      style={{ opacity: isPending ? 0.5 : 1 }}
      title={t(nextLocale)}
    >
      <Globe size={14} />
      <span>{locale === "ru" ? "EN" : "RU"}</span>
    </button>
  );
}
