"use client";

import Link from "next/link";
import { useInView } from "../hooks";

export function FinalCTASection() {
  const [ref, visible] = useInView();

  return (
    <section ref={ref} className="cta-section landing-section">
      <div className="landing-container text-center relative z-10">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl mb-6"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Ваш следующий сценарий начинается здесь.
          </h2>

          <p
            className="text-base mb-8 max-w-lg mx-auto leading-relaxed"
            style={{ color: "var(--l-text-dim)" }}
          >
            Откройте бета-доступ — бесплатно, без карты, прямо сейчас.
            <br />
            Предложение действует до 1 мая 2026.
          </p>

          <Link href="/sign-up" className="btn-primary text-base">
            Получить бесплатный доступ →
          </Link>
        </div>
      </div>
    </section>
  );
}
