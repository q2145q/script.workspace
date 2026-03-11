"use client";

import { useTranslations } from "next-intl";
import { useInView } from "../hooks";
import Link from "next/link";

export function FinalCTASection() {
  const t = useTranslations("Landing.finalCta");
  const [ref, visible] = useInView();

  return (
    <section ref={ref} className="final-cta">
      <div className="landing-container" style={{ position: "relative", zIndex: 2 }}>
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <h2
            style={{
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "var(--l-text-white)",
            }}
          >
            {t("title")}
          </h2>

          <p
            style={{
              marginTop: "1.5rem",
              fontSize: "1.1rem",
              color: "rgba(255,255,255,0.65)",
              maxWidth: 500,
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.6,
            }}
          >
            {t("subtitle")}
          </p>

          <div style={{ marginTop: "2.5rem" }}>
            <Link href="/sign-up" className="btn-primary" style={{ fontSize: "1.1rem", padding: "16px 40px" }}>
              {t("cta")}
            </Link>
          </div>

          <p
            style={{
              marginTop: "1rem",
              fontSize: "0.85rem",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            {t("note")}
          </p>
        </div>
      </div>
    </section>
  );
}
