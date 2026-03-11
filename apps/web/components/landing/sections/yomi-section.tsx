"use client";

import { useTranslations } from "next-intl";
import { useInView } from "../hooks";

export function YomiSection() {
  const [ref, visible] = useInView();
  const t = useTranslations("Landing.yomi");

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
          <div
            className="text-base leading-relaxed space-y-4 text-center"
            style={{ color: "var(--l-text-dim)" }}
          >
            <p>
              {t("description1")}
            </p>
            <p style={{ color: "var(--l-text)" }}>
              {t("description2")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
