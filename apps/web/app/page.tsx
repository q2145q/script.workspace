import { redirect } from "next/navigation";
import { auth } from "@script/api/auth";
import { headers } from "next/headers";
import { Cormorant_Garamond, IBM_Plex_Sans } from "next/font/google";
import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "YOMI Script — Редактор сценариев для российских авторов",
  description:
    "Профессиональный браузерный редактор screenplay с AI-помощником. Форматирование, версии, командная работа. Бесплатная бета. Без Final Draft.",
  openGraph: {
    title: "YOMI Script — Редактор сценариев для российских авторов",
    description:
      "Профессиональный браузерный редактор screenplay с AI-помощником. Форматирование, версии, командная работа. Бесплатная бета.",
    url: "https://script.yomimovie.art",
    siteName: "YOMI Script",
    type: "website",
    locale: "ru_RU",
  },
};

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "YOMI Script",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    url: "https://script.yomimovie.art",
    description:
      "Профессиональный браузерный редактор screenplay с AI-помощником. Форматирование, версии, командная работа. Сделан для российской индустрии.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "RUB",
      description: "Бесплатная открытая бета до 1 мая 2026",
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
