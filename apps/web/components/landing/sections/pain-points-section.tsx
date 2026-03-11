"use client";

import { useInView } from "../hooks";
import { PAIN_POINTS } from "../data";

export function PainPointsSection() {
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
            Как вы пишете сейчас?
          </h2>
        </div>

        <div
          className={`stagger ${visible ? "visible" : ""} grid gap-6 sm:grid-cols-3 mt-12`}
        >
          {PAIN_POINTS.map((pain) => (
            <div key={pain.title} className="reveal pain-card">
              <div className="text-3xl mb-4">{pain.emoji}</div>
              <h3
                className="text-lg font-semibold mb-3"
                style={{ color: "var(--l-text)" }}
              >
                {pain.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--l-text-dim)" }}
              >
                {pain.desc}
              </p>
            </div>
          ))}
        </div>

        <div className={`reveal ${visible ? "visible" : ""}`}>
          <p
            className="text-center mt-12 text-lg"
            style={{
              color: "var(--l-text-dim)",
              fontFamily: "var(--font-display)",
            }}
          >
            YOMI Script — это один инструмент вместо трёх.
          </p>
        </div>
      </div>
    </section>
  );
}
