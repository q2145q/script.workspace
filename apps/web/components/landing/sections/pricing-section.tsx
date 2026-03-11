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

  const tierKeys = ["free", "pro", "team"] as const;
  const tiers = tierKeys.map((key) => ({
    key,
    name: t(`${key}.name`),
    monthlyPrice: t(`${key}.price`),
    yearlyPrice: t(`${key}.yearlyPrice`),
    yearlyNote: key === "pro" ? t(`${key}.yearlyNote`) : undefined,
    desc: t(`${key}.desc`),
    features: t.raw(`${key}.features`) as string[],
    cta: t(`${key}.cta`),
    featured: key === "pro",
  }));

  return (
    <section ref={ref} id="pricing" className="landing-section landing-neutral">
      <div className="landing-container">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <div style={{ textAlign: "center" }}>
            <span className="eyebrow">{t("eyebrow")}</span>
            <h2
              style={{
                fontSize: "clamp(1.8rem, 4vw, 2.75rem)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                marginTop: "1rem",
              }}
            >
              {t("title")}
            </h2>
          </div>

          {/* Period toggle */}
          <div className="flex justify-center mt-8">
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
          className={`stagger ${visible ? "visible" : ""}`}
          style={{
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            marginTop: "3rem",
            alignItems: "start",
          }}
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
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: tier.featured
                    ? "var(--l-accent)"
                    : "var(--l-text-primary)",
                }}
              >
                {tier.name}
              </h3>

              <div style={{ marginTop: "1rem", marginBottom: "0.5rem" }}>
                <span
                  style={{
                    fontSize: "2.25rem",
                    fontWeight: 800,
                    color: "var(--l-text-primary)",
                  }}
                >
                  {period === "month" ? tier.monthlyPrice : tier.yearlyPrice}
                </span>
                {tier.key !== "free" && tier.key !== "team" && (
                  <span
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--l-text-muted)",
                      marginLeft: "0.35rem",
                    }}
                  >
                    / {period === "month" ? t("perMonth") : t("perYear")}
                  </span>
                )}
              </div>

              {period === "year" && tier.yearlyNote && (
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--l-accent)",
                    fontWeight: 500,
                    marginBottom: "0.5rem",
                  }}
                >
                  {tier.yearlyNote}
                </p>
              )}

              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--l-text-muted)",
                  marginBottom: "1.25rem",
                }}
              >
                {tier.desc}
              </p>

              <hr style={{ border: "none", borderTop: "1px solid var(--l-border)", margin: "0 0 1.25rem" }} />

              <ul style={{ display: "flex", flexDirection: "column", gap: "0.6rem", flex: 1, listStyle: "none", padding: 0, margin: 0 }}>
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
                href={tier.key === "team" ? "mailto:support@yomimovie.art" : "/sign-up"}
                className={`${tier.featured ? "btn-primary" : "btn-secondary"} w-full justify-center`}
                style={{ marginTop: "1.5rem" }}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className={`reveal ${visible ? "visible" : ""}`}>
          <p
            style={{
              marginTop: "2rem",
              fontSize: "0.85rem",
              color: "var(--l-text-muted)",
              textAlign: "center",
            }}
          >
            {t("paymentNote")}
          </p>
        </div>
      </div>
    </section>
  );
}
