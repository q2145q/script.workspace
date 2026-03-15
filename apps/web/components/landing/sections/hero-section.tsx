"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { HeroMockup } from "../mockups";

export function HeroSection() {
  const t = useTranslations("Landing.hero");

  return (
    <section className="hero-section">
      <div className="hero-grain" />

      <div className="landing-container w-full" style={{ position: "relative", zIndex: 2 }}>
        <div
          className="flex flex-col gap-6"
          style={{ paddingTop: "8rem", paddingBottom: "2rem" }}
        >
          <div>
            <span className="eyebrow">{t("eyebrow")}</span>
          </div>

          <h1
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              maxWidth: 750,
              color: "#FFFFFF",
              fontWeight: 800,
            }}
          >
            {t("headline")}
          </h1>

          <p className="hero-subtitle">{t("subtitle")}</p>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="/sign-up" className="btn-primary">
              {t("cta")}
            </Link>
            <button
              className="btn-secondary"
              style={{
                color: "var(--l-accent-light)",
                borderColor: "var(--l-accent-light)",
              }}
            >
              {t("ctaSecondary")}
            </button>
          </div>

          <p className="hero-sub-cta">{t("bottomNote")}</p>
        </div>

        <HeroMockup />
      </div>
    </section>
  );
}
