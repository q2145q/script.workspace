"use client";

import { useTranslations } from "next-intl";
import { useInView } from "../hooks";

export function BetaStorySection() {
  const [ref, visible] = useInView();
  const t = useTranslations("Landing.betaStory");

  return (
    <section ref={ref} className="landing-section">
      <div className="landing-container max-w-3xl mx-auto">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <h2
            className="text-3xl sm:text-4xl mb-6 text-center"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {t("title1")}{" "}
            <span style={{ color: "var(--l-accent)" }}>{t("title2")}</span>
          </h2>
        </div>

        <div className={`reveal ${visible ? "visible" : ""}`}>
          <p
            className="text-base text-center mb-8"
            style={{ color: "var(--l-text-dim)" }}
          >
            {t("subtitle")}
          </p>

          <div className="grid gap-8 sm:grid-cols-2">
            <div className="beta-story-card">
              <h3
                className="text-base font-semibold mb-4"
                style={{ color: "var(--l-text)" }}
              >
                {t("forYouTitle")}
              </h3>
              <ul
                className="space-y-3 text-sm leading-relaxed"
                style={{ color: "var(--l-text-dim)" }}
              >
                <li className="flex gap-2">
                  <span style={{ color: "var(--l-accent)" }}>→</span>
                  {t("forYou1")}
                </li>
                <li className="flex gap-2">
                  <span style={{ color: "var(--l-accent)" }}>→</span>
                  {t("forYou2")}
                </li>
                <li className="flex gap-2">
                  <span style={{ color: "var(--l-accent)" }}>→</span>
                  {t("forYou3")}
                </li>
              </ul>
            </div>

            <div className="beta-story-card">
              <h3
                className="text-base font-semibold mb-4"
                style={{ color: "var(--l-text)" }}
              >
                {t("guaranteeTitle")}
              </h3>
              <ul
                className="space-y-3 text-sm leading-relaxed"
                style={{ color: "var(--l-text-dim)" }}
              >
                <li className="flex gap-2">
                  <span style={{ color: "var(--l-accent)" }}>→</span>
                  {t("guarantee1")}
                </li>
                <li className="flex gap-2">
                  <span style={{ color: "var(--l-accent)" }}>→</span>
                  {t("guarantee2")}
                </li>
                <li className="flex gap-2">
                  <span style={{ color: "var(--l-accent)" }}>→</span>
                  {t("guarantee3")}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
