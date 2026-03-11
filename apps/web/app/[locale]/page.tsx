import { redirect } from "next/navigation";
import { auth } from "@script/api/auth";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import LandingPage from "@/components/landing/landing-page";
import "./landing.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isRu = locale === "ru";

  const title = isRu
    ? "YOMI Script — AI воркспейс для сценаристов | Сценарий, bible, анализ в браузере"
    : "YOMI Script — AI Screenplay Workspace | Script, Bible & Analysis in One Place";
  const description = isRu
    ? "Пишите сценарии в профессиональном формате. AI-помощник знает весь проект. Bible, outline, one-pager — в одном окне. Без установки."
    : "Write screenplays in professional format. AI knows your whole project. Bible, outline, and pitch artifacts — in one place. No install.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: "https://script.yomimovie.art",
      siteName: "YOMI Script",
      type: "website",
      locale: isRu ? "ru_RU" : "en_US",
    },
    alternates: {
      languages: {
        ru: "/ru",
        en: "/en",
      },
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
      ? "Пишите сценарии в профессиональном формате. AI-помощник знает весь проект. Bible, outline, one-pager — в одном окне."
      : "Write screenplays in professional format. AI knows your whole project. Bible, outline, and pitch artifacts — in one place.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: isRu ? "RUB" : "USD",
    },
    featureList: [
      "AI Rewrite & Format",
      "Screenplay formatting",
      "Project Bible",
      "Real-time collaboration",
      "Version history",
      "PDF/DOCX export",
      "Beat sheet & Structure analysis",
      "Logline & Synopsis generation",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  );
}
