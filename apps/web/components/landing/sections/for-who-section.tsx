"use client";

import { useTranslations } from "next-intl";
import { useInView } from "../hooks";
import Link from "next/link";
import { PenTool, Clapperboard, Users } from "lucide-react";

const PERSONAS = [
  { key: "screenwriter", icon: PenTool },
  { key: "director", icon: Clapperboard },
  { key: "team", icon: Users },
] as const;

export function ForWhoSection() {
  const t = useTranslations("Landing.forWho");
  const [ref, visible] = useInView();

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
          {PERSONAS.map((persona) => {
            const Icon = persona.icon;
            return (
              <div key={persona.key} className="reveal persona-card">
                <div className="persona-icon">
                  <Icon size={24} />
                </div>
                <h3
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 600,
                    color: "var(--l-text-primary)",
                  }}
                >
                  {t(`${persona.key}.title`)}
                </h3>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "var(--l-text-secondary)",
                    lineHeight: 1.5,
                    flex: 1,
                  }}
                >
                  {t(`${persona.key}.desc`)}
                </p>
                <Link
                  href="/sign-up"
                  className="btn-secondary"
                  style={{ alignSelf: "flex-start", padding: "10px 24px", fontSize: "0.9rem" }}
                >
                  {t(`${persona.key}.cta`)}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
