"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useInView } from "../hooks";
import { PenTool, BookOpen, Wand2, Megaphone } from "lucide-react";

const STEPS = [
  { key: "step1", icon: PenTool },
  { key: "step2", icon: BookOpen },
  { key: "step3", icon: Wand2 },
  { key: "step4", icon: Megaphone },
] as const;

export function WorkflowSection() {
  const t = useTranslations("Landing.workflow");
  const [ref, visible] = useInView();
  const [active, setActive] = useState(0);

  return (
    <section ref={ref} className="landing-section landing-warm">
      <div className="landing-container">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <h2
            style={{
              fontSize: "clamp(1.8rem, 4vw, 2.75rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            {t("title")}
          </h2>
        </div>

        <div
          className={`reveal ${visible ? "visible" : ""}`}
          style={{
            marginTop: "3rem",
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "2rem",
          }}
        >
          {/* Steps on left, screenshot on right (desktop) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
              gap: "3rem",
            }}
            className="workflow-layout"
          >
            <div className="workflow-steps">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.key}
                    className={`workflow-step ${active === i ? "active" : ""}`}
                    onClick={() => setActive(i)}
                  >
                    <div className="workflow-step-number">
                      <Icon size={18} />
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 600,
                          marginBottom: "0.35rem",
                          color: active === i ? "var(--l-accent)" : "var(--l-text-primary)",
                        }}
                      >
                        {t(`${step.key}title`)}
                      </h3>
                      <p
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--l-text-secondary)",
                          lineHeight: 1.5,
                        }}
                      >
                        {t(step.key)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Screenshot placeholder */}
            <div
              style={{
                background: "var(--l-bg-white)",
                border: "1px solid var(--l-border)",
                borderRadius: "16px",
                minHeight: "320px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--l-text-muted)",
                fontSize: "0.9rem",
              }}
            >
              Screenshot — Step {active + 1}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 767px) {
          .workflow-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
