"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { useTypewriter } from "../hooks";
import { SCREENPLAY, SIDEBAR_SCENES } from "../data";
import { VideoDemoModal } from "../video-demo-modal";

export function HeroSection() {
  const [loaded, setLoaded] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const tw = useTypewriter(SCREENPLAY, 28);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoaded(true);
      tw.start();
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      className="relative min-h-screen flex items-center pt-20"
      style={{ background: "var(--l-bg)" }}
    >
      <div className="hero-bg-lines" />
      <div className="hero-glow" />

      <div className="landing-container w-full">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left: text */}
          <div
            className={`hero-stagger flex-1 max-w-xl ${loaded ? "loaded" : ""}`}
          >
            <div>
              <span className="beta-badge">
                ОТКРЫТАЯ БЕТА · Бесплатный доступ до 1 мая 2026
              </span>
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl leading-tight mt-6"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              Редактор сценариев.
              <br />
              <span style={{ color: "var(--l-accent)" }}>Сделан для кино.</span>
            </h1>

            <p
              className="mt-6 text-base lg:text-lg leading-relaxed"
              style={{ color: "var(--l-text-dim)", maxWidth: 480 }}
            >
              Профессиональное screenplay-форматирование, умный помощник
              по требованию и командная работа — прямо в браузере.
              Без установки. Без Final Draft. На русском языке.
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-8">
              <Link href="/sign-up" className="btn-primary">
                Попробовать бесплатно →
              </Link>
              <button
                onClick={() => setVideoOpen(true)}
                className="btn-secondary"
              >
                <Play size={16} />
                Смотреть как это работает · 60 сек
              </button>
            </div>

            <div className="mt-6 space-y-1">
              <p className="text-xs" style={{ color: "var(--l-text-muted)" }}>
                Бесплатно · Без карты · Без установки
              </p>
              <p className="text-xs" style={{ color: "var(--l-text-muted)" }}>
                Будьте среди первых — и повлияйте на продукт
              </p>
            </div>
          </div>

          {/* Right: editor mockup */}
          <div className="flex-1 w-full max-w-2xl">
            <div className="editor-mockup">
              <div className="editor-mockup-titlebar">
                <div className="editor-dot" style={{ background: "#ff5f57" }} />
                <div className="editor-dot" style={{ background: "#febc2e" }} />
                <div className="editor-dot" style={{ background: "#28c840" }} />
                <span
                  className="ml-3 text-xs"
                  style={{
                    color: "#52525b",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Без названия — Script Workspace
                </span>
              </div>

              <div className="editor-mockup-body">
                <div className="editor-mockup-sidebar">
                  <div
                    className="px-3 pb-2 mb-1 text-[10px] uppercase tracking-wider"
                    style={{
                      color: "#52525b",
                      borderBottom: "1px solid #1e1e28",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    Сцены
                  </div>
                  {SIDEBAR_SCENES.map((s) => (
                    <div
                      key={s.num}
                      className={`editor-mockup-sidebar-item ${s.active ? "active" : ""}`}
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      <span style={{ opacity: 0.4, fontSize: 10 }}>
                        {s.num}
                      </span>
                      {s.text}
                    </div>
                  ))}
                </div>

                <div className="editor-mockup-content">
                  {tw.visible.map((line, i) => (
                    <div key={i} className={`mock-${line.type}`}>
                      {line.display}
                      {line.cursor && <span className="tw-cursor" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <VideoDemoModal open={videoOpen} onOpenChange={setVideoOpen} />
    </section>
  );
}
