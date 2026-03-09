"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useInView } from "../hooks";
import { FAQ } from "../data";

export function ClosingSection() {
  const [faqRef, faqVisible] = useInView();
  const [ctaRef, ctaVisible] = useInView();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* FAQ */}
      <section ref={faqRef} className="landing-section">
        <div className="landing-container" style={{ maxWidth: 800 }}>
          <div className={`reveal ${faqVisible ? "visible" : ""}`}>
            <hr className="editorial-rule" style={{ marginBottom: "2rem" }} />
            <h2
              className="text-3xl sm:text-4xl mb-12"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              Частые вопросы
            </h2>
          </div>

          <div className={`reveal ${faqVisible ? "visible" : ""}`}>
            {FAQ.map((item, i) => (
              <div
                key={i}
                className={`faq-item ${openIdx === i ? "open" : ""}`}
              >
                <button
                  className="faq-question"
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                >
                  <span>{item.q}</span>
                  <Plus size={18} className="faq-toggle-icon" />
                </button>
                <div className="faq-answer">
                  <p
                    className="pb-5 text-sm leading-relaxed"
                    style={{ color: "var(--l-text-dim)" }}
                  >
                    {item.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef} className="cta-section landing-section">
        <div className="landing-container relative z-10">
          <div className={`reveal ${ctaVisible ? "visible" : ""}`}>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl mb-6"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                maxWidth: 600,
              }}
            >
              Ваш следующий сценарий
              <br />
              <span style={{ color: "var(--l-accent)" }}>начинается здесь</span>
            </h2>

            <p
              className="text-base mb-8 leading-relaxed"
              style={{ color: "var(--l-text-dim)", maxWidth: 480 }}
            >
              Откройте бета-доступ — бесплатно, без карты, прямо сейчас.
              Предложение действует до 1 мая 2026.
            </p>

            <Link href="/sign-up" className="btn-primary">
              Получить бесплатный доступ
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--l-border)",
          background: "var(--l-bg)",
          padding: "3rem 0",
        }}
      >
        <div className="landing-container">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--l-text)",
                }}
              >
                Script
              </span>
              <span
                style={{
                  fontSize: "0.6rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--l-text-muted)",
                }}
              >
                Workspace
              </span>
            </div>

            <nav className="flex flex-wrap items-center gap-5 text-sm">
              <button
                onClick={() => scrollTo("pricing")}
                className="landing-nav-link"
              >
                Тарифы
              </button>
              <Link href="/docs" className="landing-nav-link">
                Документация
              </Link>
              <Link href="/sign-in" className="landing-nav-link">
                Войти
              </Link>
              <Link href="/sign-up" className="landing-nav-link">
                Регистрация
              </Link>
            </nav>
          </div>

          <hr
            className="editorial-rule wide"
            style={{ margin: "1.5rem 0" }}
          />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p
              className="text-xs"
              style={{ color: "var(--l-text-muted)" }}
            >
              © 2026 YOMI Film. Все права защищены.
              {" · "}
              Данные зашифрованы AES-256 · Мы не обучаем модели на вашем тексте
            </p>
            <div
              className="flex items-center gap-4 text-xs"
              style={{ color: "var(--l-text-muted)" }}
            >
              <a
                href="mailto:support@yomimovie.art"
                className="landing-nav-link"
              >
                support@yomimovie.art
              </a>
              <a
                href="https://t.me/yaborovkov"
                target="_blank"
                rel="noopener noreferrer"
                className="landing-nav-link"
              >
                Telegram
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
