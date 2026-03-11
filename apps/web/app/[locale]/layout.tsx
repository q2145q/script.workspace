import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { TRPCReactProvider } from "@/lib/trpc/client";
import { MotionConfigProvider } from "@/components/motion-config-provider";
import { routing } from "@/i18n/routing";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isRu = locale === "ru";

  return {
    title: {
      default: isRu
        ? "YOMI Script — AI-редактор сценариев"
        : "YOMI Script — AI Screenplay Editor",
      template: "%s — YOMI Script",
    },
    description: isRu
      ? "Профессиональная платформа для написания сценариев с AI. Совместное редактирование, форматирование, версии, экспорт в PDF/FDX."
      : "Professional AI-powered screenplay writing platform. Real-time collaboration, formatting, version history, PDF/FDX export.",
    keywords: [
      "screenplay editor",
      "screenwriting",
      "AI writing",
      "YOMI Script",
      ...(isRu ? ["сценарий", "редактор сценариев"] : []),
    ],
    authors: [{ name: "YOMI Script" }],
    creator: "YOMI Script",
    metadataBase: new URL("https://script.yomimovie.art"),
    openGraph: {
      type: "website",
      locale: isRu ? "ru_RU" : "en_US",
      url: "https://script.yomimovie.art",
      siteName: "YOMI Script",
      title: isRu
        ? "YOMI Script — AI-редактор сценариев"
        : "YOMI Script — AI Screenplay Editor",
      description: isRu
        ? "Профессиональная платформа для написания сценариев с AI. Совместное редактирование, форматирование, версии, экспорт."
        : "Professional AI-powered screenplay writing platform. Collaboration, formatting, versions, export.",
    },
    twitter: {
      card: "summary_large_image",
      title: isRu
        ? "YOMI Script — AI-редактор сценариев"
        : "YOMI Script — AI Screenplay Editor",
      description: isRu
        ? "Профессиональная платформа для написания сценариев с AI."
        : "Professional AI-powered screenplay writing platform.",
    },
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "ru" | "en")) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const tCommon = await getTranslations("Common");

  return (
    <>
      <a
        href="#main-content"
        className="fixed left-2 top-2 z-[100] -translate-y-16 rounded-md bg-cinema px-4 py-2 text-sm font-medium text-white transition-transform focus:translate-y-0"
      >
        {tCommon("skipToContent")}
      </a>
      <NextIntlClientProvider messages={messages}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <TRPCReactProvider>
            <MotionConfigProvider>
              {children}
            </MotionConfigProvider>
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-foreground)",
                },
              }}
            />
          </TRPCReactProvider>
        </ThemeProvider>
      </NextIntlClientProvider>
    </>
  );
}
