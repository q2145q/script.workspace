"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useInView } from "../hooks";

export function FAQSection() {
  const t = useTranslations("Landing.faq");
  const [ref, visible] = useInView();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  // Determine number of FAQ items dynamically
  const faqItems: { q: string; a: string }[] = [];
  for (let i = 1; i <= 10; i++) {
    try {
      const q = t(`q${i}`);
      const a = t(`a${i}`);
      if (q && a) faqItems.push({ q, a });
    } catch {
      break;
    }
  }

  return (
    <section ref={ref} className="landing-section">
      <div className="landing-container" style={{ maxWidth: 800 }}>
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <h2
            style={{
              fontSize: "clamp(1.8rem, 4vw, 2.75rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              textAlign: "center",
              marginBottom: "3rem",
            }}
          >
            {t("title")}
          </h2>
        </div>

        <div className={`reveal ${visible ? "visible" : ""}`}>
          {faqItems.map((item, i) => (
            <div
              key={i}
              className={`faq-item ${openIdx === i ? "open" : ""}`}
            >
              <button
                className="faq-question"
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
              >
                <span>{item.q}</span>
                <Plus size={18} className="faq-toggle-icon" />
              </button>
              <div className="faq-answer">
                <p
                  style={{
                    paddingBottom: "1.25rem",
                    fontSize: "0.95rem",
                    lineHeight: 1.6,
                    color: "var(--l-text-secondary)",
                  }}
                >
                  {item.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
