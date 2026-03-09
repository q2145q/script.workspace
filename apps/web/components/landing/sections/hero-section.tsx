"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function HeroSection() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="hero-section" style={{ background: "var(--l-bg)" }}>
      <div className="hero-grain" />
      <div className="hero-vertical-rule" />

      <div className="landing-container w-full">
        <div
          className={`hero-stagger flex flex-col gap-8 ${loaded ? "loaded" : ""}`}
          style={{ paddingTop: "6rem" }}
        >
          <div>
            <span className="beta-badge">
              Открытая бета · Бесплатно до 1 мая 2026
            </span>
          </div>

          <h1 className="hero-headline">
            Редактор
            <br />
            сценариев.
            <br />
            <span className="accent">Сделан для кино.</span>
          </h1>

          <p className="hero-subtitle">
            Не Google Docs. Не Final Draft. Профессиональный инструмент
            с AI-помощником — прямо в браузере, на русском языке.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="/sign-up" className="btn-primary">
              Попробовать бесплатно
            </Link>
            <Link href="/docs" className="btn-secondary">
              Документация
            </Link>
          </div>

          <p
            className="text-xs"
            style={{ color: "var(--l-text-muted)", letterSpacing: "0.05em" }}
          >
            Бесплатно · Без карты · Без установки
          </p>
        </div>
      </div>
    </section>
  );
}
