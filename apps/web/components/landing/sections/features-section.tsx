"use client";

import { useInView } from "../hooks";
import { FEATURES } from "../data";

export function FeaturesSection() {
  const [ref, visible] = useInView();

  return (
    <section ref={ref} id="features" className="landing-section">
      <div className="landing-container">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <hr className="editorial-rule" style={{ marginBottom: "2rem" }} />
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              maxWidth: 600,
            }}
          >
            Всё что нужно{" "}
            <span style={{ color: "var(--l-accent)" }}>сценаристу</span>
          </h2>
        </div>

        <div
          className={`stagger ${visible ? "visible" : ""} mt-12`}
          style={{
            display: "grid",
            gap: "1px",
            background: "var(--l-border)",
            gridTemplateColumns: "1fr",
          }}
        >
          {/* First feature — large hero card */}
          {FEATURES.slice(0, 1).map((feat) => (
            <div
              key={feat.title}
              className="reveal feature-card large"
              style={{ background: "var(--l-bg)" }}
            >
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="feature-icon">
                  <feat.icon size={22} />
                </div>
                <div>
                  <h3
                    className="text-lg sm:text-xl font-semibold mb-2"
                    style={{ color: "var(--l-text)" }}
                  >
                    {feat.title}
                  </h3>
                  <p
                    className="text-sm sm:text-base leading-relaxed"
                    style={{ color: "var(--l-text-dim)", maxWidth: 560 }}
                  >
                    {feat.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Remaining features — 2-column grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1px",
              background: "var(--l-border)",
            }}
          >
            {FEATURES.slice(1).map((feat) => (
              <div
                key={feat.title}
                className="reveal feature-card"
                style={{ background: "var(--l-bg)" }}
              >
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
      </div>
    </section>
  );
}
