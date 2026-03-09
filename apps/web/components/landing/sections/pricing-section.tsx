"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useInView } from "../hooks";
import { PRICING } from "../data";

export function PricingSection() {
  const [ref, visible] = useInView();
  const [period, setPeriod] = useState<"month" | "year">("month");

  // Only show first 3 tiers (КОМАНДА merged into PRO)
  const tiers = PRICING.slice(0, 3);

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
            Начните{" "}
            <span style={{ color: "var(--l-accent)" }}>бесплатно</span>
          </h2>

          {/* Beta offer */}
          <div className="beta-offer-banner mt-6">
            При регистрации до 1 мая 2026 — PRO на 3 месяца бесплатно
          </div>

          {/* Period toggle */}
          <div className="flex mt-8">
            <div className="pricing-toggle">
              <button
                className={period === "month" ? "active" : ""}
                onClick={() => setPeriod("month")}
              >
                Месяц
              </button>
              <button
                className={period === "year" ? "active" : ""}
                onClick={() => setPeriod("year")}
              >
                Год
                <span className="toggle-badge">−2 мес</span>
              </button>
            </div>
          </div>
        </div>

        <div
          className={`stagger ${visible ? "visible" : ""} grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-12`}
        >
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`reveal pricing-card ${tier.featured ? "featured" : ""}`}
            >
              {tier.featured && (
                <div className="pricing-badge">Популярный</div>
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
                {tier.monthlyPrice !== "0 ₽" && (
                  <span
                    className="text-sm ml-1"
                    style={{ color: "var(--l-text-muted)" }}
                  >
                    / {period === "month" ? "мес" : "год"}
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
                href={tier.ctaHref}
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
            Нужен командный тариф?{" "}
            <Link
              href="/sign-up"
              style={{ color: "var(--l-accent)", textDecoration: "underline" }}
            >
              Связаться
            </Link>
            {" "}· Оплата картами РФ · СБП · Счёт для ООО/ИП
          </p>
        </div>
      </div>
    </section>
  );
}
