"use client";

import { useInView } from "../hooks";
import { AUDIENCE } from "../data";

export function AudienceSection() {
  const [ref, visible] = useInView();

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
            Кому подходит YOMI Script
          </h2>
        </div>

        <div
          className={`stagger ${visible ? "visible" : ""} grid gap-8 sm:grid-cols-3 mt-12`}
        >
          {AUDIENCE.map((a) => (
            <div key={a.title} className="reveal audience-card">
              <div className="audience-icon">
                <span className="text-2xl">{a.emoji}</span>
              </div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: "var(--l-text)" }}
              >
                {a.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--l-text-dim)" }}
              >
                {a.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
