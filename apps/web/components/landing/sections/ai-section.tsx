"use client";

import { useInView } from "../hooks";
import { PROVIDERS } from "../data";

export function AISection() {
  const [ref, visible] = useInView();

  return (
    <section ref={ref} className="landing-section">
      <div className="landing-container" style={{ maxWidth: 800 }}>
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <hr className="editorial-rule" style={{ marginBottom: "3rem" }} />

          <blockquote className="pull-quote">
            Застряли на сцене? Попросите переписать.
            Диалог звучит деревянно? Покажите — получите варианты.
            AI объяснит что работает и почему.
          </blockquote>

          <p
            className="mt-8 text-base leading-relaxed"
            style={{ color: "var(--l-text-dim)", maxWidth: 600 }}
          >
            В кино давно привыкли работать с командой. Редактор, режиссёр,
            продюсер — каждый помогает истории стать лучше. AI в Script
            Workspace — такой же участник процесса. Не замена автору.
          </p>

          <div className="mt-10">
            <p
              className="text-xs mb-3"
              style={{
                color: "var(--l-text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Доступные модели
            </p>
            <p
              className="text-sm"
              style={{ color: "var(--l-text-dim)" }}
            >
              {PROVIDERS.map((p, i) => (
                <span key={p} className="provider-badge">
                  {p}
                  {i < PROVIDERS.length - 1 && (
                    <span style={{ color: "var(--l-text-muted)", margin: "0 0.5rem" }}>
                      ·
                    </span>
                  )}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
