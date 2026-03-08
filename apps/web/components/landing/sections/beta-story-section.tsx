"use client";

import { useInView } from "../hooks";

export function BetaStorySection() {
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
            Мы в открытой бете.{" "}
            <span style={{ color: "var(--l-accent)" }}>Это важно.</span>
          </h2>
        </div>

        <div className={`reveal ${visible ? "visible" : ""}`}>
          <p
            className="text-base text-center mb-8"
            style={{ color: "var(--l-text-dim)" }}
          >
            Script Workspace — молодой продукт. Мы не скрываем это.
          </p>

          <div className="grid gap-8 sm:grid-cols-2">
            <div className="beta-story-card">
              <h3
                className="text-base font-semibold mb-4"
                style={{ color: "var(--l-text)" }}
              >
                Что это значит для вас
              </h3>
              <ul
                className="space-y-3 text-sm leading-relaxed"
                style={{ color: "var(--l-text-dim)" }}
              >
                <li className="flex gap-2">
                  <span style={{ color: "var(--l-accent)" }}>→</span>
                  Бесплатный PRO-доступ пока идёт бета (до 1 мая 2026)
                </li>
                <li className="flex gap-2">
                  <span style={{ color: "var(--l-accent)" }}>→</span>
                  Ваш фидбек напрямую влияет на то, что мы делаем дальше
                </li>
                <li className="flex gap-2">
                  <span style={{ color: "var(--l-accent)" }}>→</span>
                  Вы будете среди первых, кто освоил инструмент до его роста
                </li>
              </ul>
            </div>

            <div className="beta-story-card">
              <h3
                className="text-base font-semibold mb-4"
                style={{ color: "var(--l-text)" }}
              >
                Что мы гарантируем
              </h3>
              <ul
                className="space-y-3 text-sm leading-relaxed"
                style={{ color: "var(--l-text-dim)" }}
              >
                <li className="flex gap-2">
                  <span style={{ color: "var(--l-accent)" }}>→</span>
                  Ваши сценарии в безопасности (шифрование AES-256-GCM)
                </li>
                <li className="flex gap-2">
                  <span style={{ color: "var(--l-accent)" }}>→</span>
                  Мы не используем ваш текст для обучения моделей
                </li>
                <li className="flex gap-2">
                  <span style={{ color: "var(--l-accent)" }}>→</span>
                  Поддержка отвечает в течение 24 часов
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
