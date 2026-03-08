"use client";

import { useInView } from "../hooks";
import { FEATURES } from "../data";

export function FeaturesSection() {
  const [ref, visible] = useInView();

  return (
    <section ref={ref} id="features" className="landing-section">
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
            Всё что нужно сценаристу.{" "}
            <span style={{ color: "var(--l-accent)" }}>В одном месте.</span>
          </h2>
        </div>

        <div
          className={`stagger ${visible ? "visible" : ""} grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-12`}
        >
          {FEATURES.map((feat) => (
            <div key={feat.title} className="reveal feature-card">
              <div className="feature-icon">
                <feat.icon size={20} />
              </div>
              <h3
                className="text-base font-semibold mb-2"
                style={{ color: "var(--l-text)" }}
              >
                {feat.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--l-text-dim)" }}
              >
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
