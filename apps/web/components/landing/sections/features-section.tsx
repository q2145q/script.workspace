"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  PenTool,
  Wand2,
  MessageSquareText,
  History,
  Clapperboard,
  FileDown,
} from "lucide-react";
import { useInView, useTypewriter } from "../hooks";
import { SCREENPLAY, SIDEBAR_SCENES } from "../data";

const FEATURE_KEYS = [
  { key: "formatting", icon: PenTool },
  { key: "rewrite", icon: Wand2 },
  { key: "chat", icon: MessageSquareText },
  { key: "versions", icon: History },
  { key: "series", icon: Clapperboard },
  { key: "export", icon: FileDown },
] as const;

export function FeaturesSection() {
  const [ref, visible] = useInView();
  const [started, setStarted] = useState(false);
  const tw = useTypewriter(SCREENPLAY, 28);
  const t = useTranslations("Landing.features");

  useEffect(() => {
    if (visible && !started) {
      setStarted(true);
      tw.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <section ref={ref} id="features" className="landing-section">
      <div className="landing-container">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <hr className="editorial-rule" style={{ marginBottom: "2rem" }} />
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              maxWidth: 600,
            }}
          >
            {t("title")}{" "}
            <span style={{ color: "var(--l-accent)" }}>{t("titleAccent")}</span>
          </h2>
        </div>

        {/* Editor mockup with typewriter */}
        <div
          className={`reveal ${visible ? "visible" : ""} mt-10`}
          style={{ maxWidth: 900, margin: "0 auto" }}
        >
          <div className="editor-mockup">
            <div className="editor-mockup-titlebar">
              <div className="editor-dot" style={{ background: "#ff5f57" }} />
              <div className="editor-dot" style={{ background: "#febc2e" }} />
              <div className="editor-dot" style={{ background: "#28c840" }} />
              <span className="ml-3 text-xs" style={{ color: "#52525b" }}>
                {t("mockupTitle")}
              </span>
            </div>

            <div className="editor-mockup-body">
              <div className="editor-mockup-sidebar">
                <div
                  className="px-3 pb-2 mb-1 text-[10px] uppercase tracking-wider"
                  style={{
                    color: "#52525b",
                    borderBottom: "1px solid #1a1a22",
                  }}
                >
                  {t("mockupScenes")}
                </div>
                {SIDEBAR_SCENES.map((s) => (
                  <div
                    key={s.num}
                    className={`editor-mockup-sidebar-item ${s.active ? "active" : ""}`}
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

        {/* Feature cards grid — all cards are direct children for stagger animation */}
        <div
          className={`stagger ${visible ? "visible" : ""} mt-12`}
          style={{
            display: "grid",
            gap: "1px",
            background: "var(--l-border)",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          {FEATURE_KEYS.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.key}
                className={`reveal feature-card${i === 0 ? " large" : ""}`}
                style={{ background: "var(--l-bg)" }}
              >
                {i === 0 ? (
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <div className="feature-icon">
                      <Icon size={22} />
                    </div>
                    <div>
                      <h3
                        className="text-lg sm:text-xl font-semibold mb-2"
                        style={{ color: "var(--l-text)" }}
                      >
                        {t(`${feat.key}.title`)}
                      </h3>
                      <p
                        className="text-sm sm:text-base leading-relaxed"
                        style={{ color: "var(--l-text-dim)", maxWidth: 560 }}
                      >
                        {t(`${feat.key}.desc`)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="feature-icon">
                      <Icon size={20} />
                    </div>
                    <h3
                      className="text-base font-semibold mb-2"
                      style={{ color: "var(--l-text)" }}
                    >
                      {t(`${feat.key}.title`)}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--l-text-dim)" }}
                    >
                      {t(`${feat.key}.desc`)}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
