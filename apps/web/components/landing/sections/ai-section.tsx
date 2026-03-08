"use client";

import { useInView } from "../hooks";
import { PROVIDERS } from "../data";

export function AISection() {
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
            Умный помощник.{" "}
            <span style={{ color: "var(--l-accent)" }}>Не замена автору.</span>
          </h2>
        </div>

        <div className={`reveal ${visible ? "visible" : ""}`}>
          <div
            className="text-base leading-relaxed space-y-4 text-center"
            style={{ color: "var(--l-text-dim)" }}
          >
            <p>
              В кино давно привыкли работать с командой. Редактор, режиссёр,
              продюсер — каждый помогает истории стать лучше. AI в Script
              Workspace — такой же участник процесса.
            </p>
            <p style={{ color: "var(--l-text)" }}>
              Застряли на сцене? Попросите переписать.
              <br />
              Диалог звучит деревянно? Покажите — получите варианты.
              <br />
              Не можете выбрать структуру? AI объяснит что работает и почему.
            </p>
            <p
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--l-accent)",
                fontSize: "1.1rem",
              }}
            >
              Ваша история. Ваш голос. Наш инструмент.
            </p>
          </div>
        </div>

        <div className={`reveal ${visible ? "visible" : ""}`}>
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {PROVIDERS.map((p) => (
              <span key={p} className="provider-badge">
                {p}
              </span>
            ))}
          </div>

          <p
            className="text-center mt-6 text-xs"
            style={{ color: "var(--l-text-muted)" }}
          >
            Данные в безопасности · Шифрование AES-256 · Мы не обучаем модели на
            вашем тексте
          </p>
        </div>
      </div>
    </section>
  );
}
