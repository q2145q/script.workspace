"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function HeroSection() {
  const t = useTranslations("Landing.hero");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="hero-section" style={{ background: "var(--l-bg)" }}>
      <div className="hero-grain" />
      <div className="hero-vertical-rule" />

      <div className="landing-container w-full">
        <div
          className={`hero-stagger flex flex-col gap-8 ${loaded ? "loaded" : ""}`}
          style={{ paddingTop: "6rem" }}
        >
          <div>
            <span className="beta-badge">{t("betaBadge")}</span>
          </div>

          <h1 className="hero-headline">
            {t("headline1")}
            <br />
            {t("headline2")}
            <br />
            <span className="accent">{t("headline3")}</span>
          </h1>

          <p className="hero-subtitle">{t("subtitle")}</p>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="/sign-up" className="btn-primary">
              {t("cta")}
            </Link>
            <Link href="/docs" className="btn-secondary">
              {t("ctaDocs")}
            </Link>
          </div>

          <p
            className="text-xs"
            style={{ color: "var(--l-text-muted)", letterSpacing: "0.05em" }}
          >
            {t("bottomNote")}
          </p>
        </div>
      </div>
    </section>
  );
}
