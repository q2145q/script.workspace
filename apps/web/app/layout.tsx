import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { Geist } from "next/font/google";
import { TRPCReactProvider } from "@/lib/trpc/client";
import { MotionConfigProvider } from "@/components/motion-config-provider";
import "./globals.css";

const geist = Geist({
  subsets: ["cyrillic", "latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Script Workspace — AI-редактор сценариев",
    template: "%s — Script Workspace",
  },
  description:
    "Профессиональная платформа для написания сценариев с AI. Совместное редактирование, форматирование, версии, экспорт в PDF/FDX.",
  keywords: [
    "сценарий",
    "редактор сценариев",
    "screenplay editor",
    "screenwriting",
    "AI writing",
    "Script Workspace",
  ],
  authors: [{ name: "Script Workspace" }],
  creator: "Script Workspace",
  metadataBase: new URL("https://script.yomimovie.art"),
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://script.yomimovie.art",
    siteName: "Script Workspace",
    title: "Script Workspace — AI-редактор сценариев",
    description:
      "Профессиональная платформа для написания сценариев с AI. Совместное редактирование, форматирование, версии, экспорт.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Script Workspace — AI-редактор сценариев",
    description:
      "Профессиональная платформа для написания сценариев с AI.",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const tCommon = await getTranslations("Common");

  return (
    <html lang={locale} className={geist.variable} suppressHydrationWarning>
      <body className="antialiased">
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
      </body>
    </html>
  );
}
