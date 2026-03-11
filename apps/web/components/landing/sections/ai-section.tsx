"use client";

import { useTranslations } from "next-intl";
import { useInView } from "../hooks";

export function AISection() {
  const t = useTranslations("Landing.ai");
  const [ref, visible] = useInView();

  const theses = [
    { num: "1", text: t("thesis1") },
    { num: "2", text: t("thesis2") },
    { num: "3", text: t("thesis3") },
  ];

  return (
    <section ref={ref} className="landing-section landing-dark">
      <div className="landing-container" style={{ maxWidth: 900 }}>
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <span className="eyebrow">{t("eyebrow")}</span>

          <h2
            style={{
              fontSize: "clamp(1.8rem, 4vw, 2.75rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              marginTop: "1.5rem",
              color: "var(--l-text-white)",
            }}
          >
            {t("title")}
          </h2>

          <p
            style={{
              marginTop: "1.5rem",
              fontSize: "1.1rem",
              color: "rgba(255,255,255,0.7)",
              maxWidth: 650,
              lineHeight: 1.6,
            }}
          >
            {t("subtitle")}
          </p>
        </div>

        {/* 3 thesis items */}
        <div
          className={`reveal ${visible ? "visible" : ""}`}
          style={{
            marginTop: "3rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          {theses.map((item) => (
            <div key={item.num} className="ai-thesis">
              <div className="ai-thesis-num">{item.num}</div>
              <p
                style={{
                  fontSize: "1rem",
                  color: "rgba(255,255,255,0.85)",
                  lineHeight: 1.5,
                  paddingTop: "0.4rem",
                }}
              >
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
