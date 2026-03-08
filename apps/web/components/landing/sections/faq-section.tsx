"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useInView } from "../hooks";
import { FAQ } from "../data";

export function FAQSection() {
  const [ref, visible] = useInView();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section ref={ref} className="landing-section">
      <div className="landing-container max-w-3xl mx-auto">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <h2
            className="text-3xl sm:text-4xl mb-12 text-center"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Частые вопросы
          </h2>
        </div>

        <div className={`reveal ${visible ? "visible" : ""}`}>
          {FAQ.map((item, i) => (
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
                  className="pb-5 text-sm leading-relaxed"
                  style={{ color: "var(--l-text-dim)" }}
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
