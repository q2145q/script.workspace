"use client";

import { useInView } from "../hooks";
import { COMPARISON_ROWS } from "../data";

const COMPETITORS = [
  { name: "STARC", type: "Десктоп", price: "~380 ₽/мес" },
  { name: "КиТ Сценарист", type: "Десктоп", price: "единоразово" },
  { name: "Final Draft", type: "Десктоп", price: "$250" },
];

const SW_HIGHLIGHTS = [
  { label: "Платформа", value: "Браузер" },
  { label: "AI", value: "Встроен" },
  { label: "AI Rewrite", value: "✓" },
  { label: "Командная работа", value: "✓" },
  { label: "Русский язык", value: "Полный" },
  { label: "Оплата из РФ", value: "✓" },
  { label: "YandexGPT", value: "✓" },
  { label: "Цена", value: "от 0 ₽" },
];

export function ComparisonSection() {
  const [ref, visible] = useInView();

  return (
    <section ref={ref} className="landing-section">
      <div className="landing-container">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <hr className="editorial-rule" style={{ marginBottom: "2rem" }} />
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl mb-12"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              maxWidth: 500,
            }}
          >
            Почему не{" "}
            <span style={{ color: "var(--l-accent)" }}>Final Draft</span>?
          </h2>
        </div>

        <div
          className={`stagger ${visible ? "visible" : ""}`}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "1.5rem",
          }}
        >
          {/* Script Workspace — hero card */}
          <div className="reveal comparison-hero-card">
            <div className="flex items-center gap-3 mb-6">
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.35rem",
                  fontWeight: 700,
                }}
              >
                Script Workspace
              </span>
              <span
                className="text-xs"
                style={{
                  color: "var(--l-accent)",
                  border: "1px solid rgba(196, 29, 29, 0.3)",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "2px",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                Браузер
              </span>
            </div>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
            >
              {SW_HIGHLIGHTS.map((h) => (
                <div key={h.label} className="flex items-center gap-2">
                  <span
                    className="text-sm"
                    style={{ color: "var(--l-text-muted)" }}
                  >
                    {h.label}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{
                      color:
                        h.value === "✓" ? "var(--l-green)" : "var(--l-text)",
                    }}
                  >
                    {h.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Competitors — stacked cards */}
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
          >
            {COMPETITORS.map((c) => (
              <div key={c.name} className="reveal comparison-competitor">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm">{c.name}</span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--l-text-muted)" }}
                  >
                    {c.type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs"
                    style={{ color: "var(--l-text-muted)" }}
                  >
                    AI Rewrite
                  </span>
                  <span className="dash-mark text-sm">—</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span
                    className="text-xs"
                    style={{ color: "var(--l-text-muted)" }}
                  >
                    YandexGPT
                  </span>
                  <span className="dash-mark text-sm">—</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span
                    className="text-xs"
                    style={{ color: "var(--l-text-muted)" }}
                  >
                    Цена
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: "var(--l-text-dim)" }}
                  >
                    {c.price}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
