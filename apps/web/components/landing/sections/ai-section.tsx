"use client";

import { useTranslations } from "next-intl";
import { useInView } from "../hooks";
import { PROVIDERS } from "../data";

export function AISection() {
  const t = useTranslations("Landing.ai");
  const [ref, visible] = useInView();

  return (
    <section ref={ref} className="landing-section">
      <div className="landing-container" style={{ maxWidth: 800 }}>
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <hr className="editorial-rule" style={{ marginBottom: "3rem" }} />

          <blockquote className="pull-quote">
            {t("quote")}
          </blockquote>

          <p
            className="mt-8 text-base leading-relaxed"
            style={{ color: "var(--l-text-dim)", maxWidth: 600 }}
          >
            {t("description")}
          </p>

          <div className="mt-10">
            <p
              className="text-xs mb-3"
              style={{
                color: "var(--l-text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {t("modelsLabel")}
            </p>
            <p
              className="text-sm"
              style={{ color: "var(--l-text-dim)" }}
            >
              {PROVIDERS.map((p, i) => (
                <span key={p} className="provider-badge">
                  {p}
                  {i < PROVIDERS.length - 1 && (
                    <span style={{ color: "var(--l-text-muted)", margin: "0 0.5rem" }}>
                      ·
                    </span>
                  )}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
