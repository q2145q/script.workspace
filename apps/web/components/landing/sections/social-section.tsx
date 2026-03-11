"use client";

import { useTranslations } from "next-intl";
import { useInView } from "../hooks";

const QUOTES = [1, 2, 3] as const;

export function SocialSection() {
  const t = useTranslations("Landing.social");
  const [ref, visible] = useInView();

  return (
    <section ref={ref} className="landing-section">
      <div className="landing-container">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <h2
            style={{
              fontSize: "clamp(1.8rem, 4vw, 2.75rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              textAlign: "center",
            }}
          >
            {t("title")}
          </h2>
        </div>

        <div
          className={`stagger ${visible ? "visible" : ""}`}
          style={{
            marginTop: "3rem",
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          {QUOTES.map((i) => (
            <div key={i} className="reveal testimonial-card">
              <p className="testimonial-quote">{t(`quote${i}`)}</p>
              <p
                style={{
                  marginTop: "1rem",
                  fontSize: "0.85rem",
                  color: "var(--l-text-muted)",
                  fontWeight: 500,
                }}
              >
                — {t(`author${i}`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
