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
    <section className="hero-section">
      <div className="hero-grain" />

      <div className="landing-container w-full" style={{ position: "relative", zIndex: 2 }}>
        <div
          className={`hero-stagger flex flex-col gap-6 ${loaded ? "loaded" : ""}`}
          style={{ paddingTop: "8rem", paddingBottom: "4rem" }}
        >
          <div>
            <span className="eyebrow">{t("eyebrow")}</span>
          </div>

          <h1 className="hero-headline">{t("headline")}</h1>

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

          {/* UI Mockup placeholder */}
          <div
            style={{
              marginTop: "2rem",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "2rem",
              minHeight: "300px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.3)",
              fontSize: "0.9rem",
            }}
          >
            UI Mockup — YOMI Script Interface
          </div>
        </div>
      </div>
    </section>
  );
}
