import { redirect } from "next/navigation";
import { auth } from "@script/api/auth";
import { headers } from "next/headers";
import { Cormorant_Garamond, IBM_Plex_Sans } from "next/font/google";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import LandingPage from "@/components/landing/landing-page";
import "./landing.css";

const cormorant = Cormorant_Garamond({
  weight: ["400", "600", "700"],
  subsets: ["cyrillic", "latin"],
  variable: "--font-display",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["300", "400", "500"],
  subsets: ["cyrillic", "latin"],
  variable: "--font-body",
  display: "swap",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isRu = locale === "ru";

  return {
    title: isRu
      ? "YOMI Script — Редактор сценариев для российских авторов"
      : "YOMI Script — AI Screenplay Editor for Writers",
    description: isRu
      ? "Профессиональный браузерный редактор screenplay с AI-помощником. Форматирование, версии, командная работа. Бесплатная бета."
      : "Professional browser-based screenplay editor with AI assistant. Formatting, versions, collaboration. Free beta.",
    openGraph: {
      title: isRu
        ? "YOMI Script — Редактор сценариев для российских авторов"
        : "YOMI Script — AI Screenplay Editor for Writers",
      description: isRu
        ? "Профессиональный браузерный редактор screenplay с AI-помощником. Форматирование, версии, командная работа. Бесплатная бета."
        : "Professional browser-based screenplay editor with AI assistant. Formatting, versions, collaboration. Free beta.",
      url: "https://script.yomimovie.art",
      siteName: "YOMI Script",
      type: "website",
      locale: isRu ? "ru_RU" : "en_US",
    },
  };
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  const isRu = locale === "ru";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "YOMI Script",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    url: "https://script.yomimovie.art",
    description: isRu
      ? "Профессиональный браузерный редактор screenplay с AI-помощником. Форматирование, версии, командная работа."
      : "Professional browser-based screenplay editor with AI assistant. Formatting, versions, real-time collaboration.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: isRu ? "RUB" : "USD",
      description: isRu
        ? "Бесплатная открытая бета до 1 мая 2026"
        : "Free open beta until May 1, 2026",
    },
    featureList: [
      "AI Rewrite & Format",
      "Screenplay formatting",
      "Real-time collaboration",
      "Version history",
      "PDF/FDX export",
      "Multi-provider AI (OpenAI, Anthropic, DeepSeek, Gemini, Yandex, Grok)",
    ],
  };

  return (
    <div className={`${cormorant.variable} ${ibmPlexSans.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </div>
  );
}
