"use client";

import { useTranslations } from "next-intl";
import { useInView } from "../hooks";

const items = [
  { emoji: "✍️", key: "screenwriters" },
  { emoji: "📺", key: "showrunners" },
  { emoji: "🎬", key: "producers" },
];

export function AudienceSection() {
  const [ref, visible] = useInView();
  const t = useTranslations("Landing.audience");

  return (
    <section ref={ref} className="landing-section">
      <div className="landing-container">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <h2
            className="text-3xl sm:text-4xl mb-4 text-center"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {t("title")}
          </h2>
        </div>

        <div
          className={`stagger ${visible ? "visible" : ""} grid gap-8 sm:grid-cols-3 mt-12`}
        >
          {items.map((a) => (
            <div key={a.key} className="reveal audience-card">
              <div className="audience-icon">
                <span className="text-2xl">{a.emoji}</span>
              </div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: "var(--l-text)" }}
              >
                {t(`${a.key}.title`)}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--l-text-dim)" }}
              >
                {t(`${a.key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
