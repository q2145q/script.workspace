"use client";

import { useState, useEffect } from "react";
import { useInView, useTypewriter } from "../hooks";
import { SCREENPLAY, SIDEBAR_SCENES } from "../data";

export function EditorShowcaseSection() {
  const [ref, visible] = useInView();
  const [started, setStarted] = useState(false);
  const tw = useTypewriter(SCREENPLAY, 28);

  useEffect(() => {
    if (visible && !started) {
      setStarted(true);
      tw.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <section ref={ref} className="editor-showcase landing-section">
      <div className="landing-container">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <h2
            className="text-2xl sm:text-3xl lg:text-4xl mb-10 text-center"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
            }}
          >
            Так выглядит ваш
            <br />
            <span style={{ color: "var(--l-accent)" }}>следующий сценарий</span>
          </h2>
        </div>

        <div
          className={`reveal ${visible ? "visible" : ""}`}
          style={{ maxWidth: 900, margin: "0 auto" }}
        >
          <div className="editor-mockup">
            <div className="editor-mockup-titlebar">
              <div className="editor-dot" style={{ background: "#ff5f57" }} />
              <div className="editor-dot" style={{ background: "#febc2e" }} />
              <div className="editor-dot" style={{ background: "#28c840" }} />
              <span
                className="ml-3 text-xs"
                style={{ color: "#52525b" }}
              >
                Без названия — YOMI Script
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
                  Сцены
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
      </div>
    </section>
  );
}
