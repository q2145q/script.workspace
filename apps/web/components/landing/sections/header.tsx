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
    <header className={`landing-header ${scrolled ? "scrolled" : ""}`}>
      <div className="landing-container flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/yomi-light.svg" alt="YOMI" className="h-7 w-auto" />
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
        </Link>

        <nav className="hidden md:flex items-center gap-8">
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
          <Link href="/tutorial" className="landing-nav-link">
            Руководство
          </Link>
          <Link href="/docs" className="landing-nav-link">
            Документация
          </Link>
          <Link href="/sign-in" className="landing-nav-link">
            Войти
          </Link>
          <Link href="/sign-up" className="btn-primary text-sm">
            Попробовать бесплатно
          </Link>
        </nav>

        <button
          className="md:hidden text-[var(--l-text)]"
          style={{ background: "none", border: "none", cursor: "pointer" }}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Меню"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="landing-mobile-menu">
          <button onClick={() => scrollTo("features")}>Возможности</button>
          <button onClick={() => scrollTo("pricing")}>Тарифы</button>
          <Link href="/tutorial" onClick={() => setMobileOpen(false)}>
            Руководство
          </Link>
          <Link href="/docs" onClick={() => setMobileOpen(false)}>
            Документация
          </Link>
          <Link href="/sign-in" onClick={() => setMobileOpen(false)}>
            Войти
          </Link>
          <Link
            href="/sign-up"
            className="btn-primary text-center"
            onClick={() => setMobileOpen(false)}
          >
            Попробовать бесплатно
          </Link>
        </div>
      )}
    </header>
  );
}
