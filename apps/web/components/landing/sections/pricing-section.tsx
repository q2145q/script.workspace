"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useInView } from "../hooks";

export function PricingSection() {
  const [ref, visible] = useInView();
  const [period, setPeriod] = useState<"month" | "year">("month");
  const t = useTranslations("Landing.pricing");

  const tierKeys = ["free", "start", "pro"] as const;
  const tiers = tierKeys.map((key) => ({
    key,
    name: t(`${key}.name`),
    monthlyPrice: t(`${key}.price`),
    yearlyPrice: t(`${key}.yearlyPrice`),
    yearlyNote: key !== "free" ? t(`${key}.yearlyNote`) : undefined,
    projects: t(`${key}.projects`),
    aiRequests: t(`${key}.aiRequests`),
    features: t.raw(`${key}.features`) as string[],
    cta: t(`${key}.cta`),
    featured: key === "pro",
  }));

  return (
    <section ref={ref} id="pricing" className="landing-section">
      <div className="landing-container">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <hr className="editorial-rule" style={{ marginBottom: "2rem" }} />
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl mb-4"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              maxWidth: 500,
            }}
          >
            {t("title")}{" "}
            <span style={{ color: "var(--l-accent)" }}>{t("titleAccent")}</span>
          </h2>

          {/* Beta offer */}
          <div className="beta-offer-banner mt-6">
            {t("betaOffer")}
          </div>

          {/* Period toggle */}
          <div className="flex mt-8">
            <div className="pricing-toggle">
              <button
                className={period === "month" ? "active" : ""}
                onClick={() => setPeriod("month")}
              >
                {t("month")}
              </button>
              <button
                className={period === "year" ? "active" : ""}
                onClick={() => setPeriod("year")}
              >
                {t("year")}
                <span className="toggle-badge">{t("yearDiscount")}</span>
              </button>
            </div>
          </div>
        </div>

        <div
          className={`stagger ${visible ? "visible" : ""} grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-12`}
        >
          {tiers.map((tier) => (
            <div
              key={tier.key}
              className={`reveal pricing-card ${tier.featured ? "featured" : ""}`}
            >
              {tier.featured && (
                <div className="pricing-badge">{t("popular")}</div>
              )}

              <h3
                className="text-lg font-bold mb-1"
                style={{
                  color: tier.featured
                    ? "var(--l-accent)"
                    : "var(--l-text)",
                }}
              >
                {tier.name}
              </h3>

              <div className="mt-3 mb-1">
                <span
                  className="text-3xl font-bold"
                  style={{ color: "var(--l-text)" }}
                >
                  {period === "month" ? tier.monthlyPrice : tier.yearlyPrice}
                </span>
                {tier.key !== "free" && (
                  <span
                    className="text-sm ml-1"
                    style={{ color: "var(--l-text-muted)" }}
                  >
                    / {period === "month" ? t("perMonth") : t("perYear")}
                  </span>
                )}
              </div>

              {period === "year" && tier.yearlyNote && (
                <p
                  className="text-xs mb-3"
                  style={{ color: "var(--l-accent)" }}
                >
                  {tier.yearlyNote}
                </p>
              )}

              <p
                className="text-xs mb-1"
                style={{ color: "var(--l-text-muted)" }}
              >
                {tier.projects} · AI: {tier.aiRequests}
              </p>

              <hr className="editorial-rule wide my-4" />

              <ul className="space-y-2.5 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="pricing-feature">
                    <span className="pricing-check">
                      <Check size={10} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-up"
                className={`mt-6 text-center ${tier.featured ? "btn-primary" : "btn-secondary"} w-full justify-center`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className={`reveal ${visible ? "visible" : ""}`}>
          <p
            className="mt-8 text-sm"
            style={{ color: "var(--l-text-muted)" }}
          >
            {t("teamQuestion")}{" "}
            <Link
              href="/sign-up"
              style={{ color: "var(--l-accent)", textDecoration: "underline" }}
            >
              {t("contact")}
            </Link>
            {" "}· {t("paymentMethods")}
          </p>
        </div>
      </div>
    </section>
  );
}
