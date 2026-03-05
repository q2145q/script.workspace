import { redirect } from "next/navigation";
import { auth } from "@script/api/auth";
import { headers } from "next/headers";
import { Playfair_Display, IBM_Plex_Mono } from "next/font/google";
import type { Metadata } from "next";
import LandingPage from "@/components/landing/landing-page";
import "./landing.css";

const playfair = Playfair_Display({
  subsets: ["cyrillic", "latin"],
  variable: "--font-display",
  display: "swap",
});

const ibmPlex = IBM_Plex_Mono({
  weight: ["300", "400", "500"],
  subsets: ["cyrillic", "latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Script Workspace — AI-редактор сценариев",
  description:
    "Профессиональный редактор сценариев с AI-соавтором. Форматирование screenplay, AI Rewrite, комментарии, версии. Получите бета-доступ бесплатно.",
  openGraph: {
    title: "Script Workspace — AI-редактор сценариев",
    description:
      "Профессиональный редактор сценариев с AI-соавтором. Форматирование screenplay, AI Rewrite, комментарии, версии.",
    url: "https://script.yomimovie.art",
    siteName: "Script Workspace",
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

  return (
    <div className={`${playfair.variable} ${ibmPlex.variable}`}>
      <LandingPage />
    </div>
  );
}
