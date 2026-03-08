"use client";

import Link from "next/link";

export function LandingFooter() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer
      className="py-12"
      style={{
        borderTop: "1px solid var(--l-border)",
        background: "var(--l-bg)",
      }}
    >
      <div className="landing-container">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/yomi-light.svg" alt="YOMI" className="h-6 w-auto" />
            <span
              className="text-xs tracking-widest uppercase"
              style={{
                color: "var(--l-text-muted)",
                fontFamily: "var(--font-body)",
                letterSpacing: "0.15em",
              }}
            >
              Script
            </span>
          </div>

          <nav className="flex flex-wrap items-center gap-6 text-sm">
            <button
              onClick={() => scrollTo("pricing")}
              className="landing-nav-link"
            >
              Тарифы
            </button>
            <Link href="/tutorial" className="landing-nav-link">
              Руководство
            </Link>
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

        <div className="section-divider my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p
            className="text-xs"
            style={{ color: "var(--l-text-muted)" }}
          >
            © 2026 YOMI Film. Все права защищены.
          </p>
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--l-text-muted)" }}>
            <a href="mailto:support@yomimovie.art" className="landing-nav-link">
              support@yomimovie.art
            </a>
            <a href="https://t.me/yaborovkov" target="_blank" rel="noopener noreferrer" className="landing-nav-link">
              Telegram
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
