"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function Header({ scrolled }: { scrolled: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <header className={`landing-header ${scrolled ? "scrolled" : ""}`}>
        <div className="landing-container flex items-center justify-between h-16">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            style={{ textDecoration: "none" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/yomi-light.svg" alt="YOMI" className="h-7 w-auto" />
            <span
              style={{
                fontSize: "0.65rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--l-text-muted)",
                fontWeight: 400,
              }}
            >
              Script
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            <button
              onClick={() => scrollTo("features")}
              className="landing-nav-link"
            >
              Возможности
            </button>
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
            <Link href="/sign-up" className="btn-primary text-sm">
              Попробовать
            </Link>
          </nav>

          <button
            className="md:hidden"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--l-text)",
            }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Меню"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile side panel */}
      <div
        className={`landing-mobile-overlay ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />
      <div className={`landing-mobile-panel ${mobileOpen ? "open" : ""}`}>
        <div className="flex justify-end">
          <button
            onClick={() => setMobileOpen(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--l-text-dim)",
            }}
            aria-label="Закрыть"
          >
            <X size={22} />
          </button>
        </div>
        <button onClick={() => scrollTo("features")}>Возможности</button>
        <button onClick={() => scrollTo("pricing")}>Тарифы</button>
        <Link href="/docs" onClick={() => setMobileOpen(false)}>
          Документация
        </Link>
        <Link href="/sign-in" onClick={() => setMobileOpen(false)}>
          Войти
        </Link>
        <Link
          href="/sign-up"
          className="btn-primary"
          onClick={() => setMobileOpen(false)}
          style={{ textAlign: "center", justifyContent: "center" }}
        >
          Попробовать бесплатно
        </Link>
      </div>
    </>
  );
}
