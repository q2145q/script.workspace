"use client";

import { useInView } from "../hooks";

export function YomiSection() {
  const [ref, visible] = useInView();

  return (
    <section ref={ref} className="landing-section">
      <div className="landing-container max-w-3xl mx-auto">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <h2
            className="text-3xl sm:text-4xl mb-6 text-center"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            YOMI делает сервисы для кино.{" "}
            <span style={{ color: "var(--l-accent)" }}>Прямо под вас.</span>
          </h2>
        </div>

        <div className={`reveal ${visible ? "visible" : ""}`}>
          <div
            className="text-base leading-relaxed space-y-4 text-center"
            style={{ color: "var(--l-text-dim)" }}
          >
            <p>
              Мы — команда, которая работает в кинопроизводстве и делает
              инструменты для индустрии. Не универсальные продукты «для всех», а
              сервисы, которые понимают специфику вашей работы: как устроен
              сценарный процесс, как работают продакшны, что нужно шоураннеру.
            </p>
            <p style={{ color: "var(--l-text)" }}>
              YOMI Script — первый продукт YOMI. Но не последний.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
