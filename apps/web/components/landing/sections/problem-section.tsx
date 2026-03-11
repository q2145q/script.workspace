"use client";

import { useTranslations } from "next-intl";
import { useInView } from "../hooks";
import { FileText, BookOpen, Table, FileDown as FileIcon, MessageSquare, ArrowRight } from "lucide-react";

const TOOLS = [
  { icon: FileText, label: "Word" },
  { icon: BookOpen, label: "Notion" },
  { icon: Table, label: "Excel" },
  { icon: MessageSquare, label: "ChatGPT" },
  { icon: FileIcon, label: "Google Docs" },
];

export function ProblemSection() {
  const t = useTranslations("Landing.problem");
  const [ref, visible] = useInView();

  return (
    <section ref={ref} className="landing-section landing-neutral">
      <div className="landing-container">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <h2
            style={{
              fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)",
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              maxWidth: 700,
            }}
          >
            {t("title")}
          </h2>
          <p
            style={{
              marginTop: "1.5rem",
              fontSize: "1.1rem",
              color: "var(--l-text-secondary)",
              maxWidth: 600,
              lineHeight: 1.6,
            }}
          >
            {t("subtitle")}
          </p>
        </div>

        {/* Visual: scattered tools → YOMI */}
        <div
          className={`reveal ${visible ? "visible" : ""}`}
          style={{ marginTop: "3rem" }}
        >
          <div className="problem-icon-grid">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <div key={tool.label} className="problem-icon">
                  <div>
                    <Icon size={20} style={{ marginBottom: 4 }} />
                    <div>{tool.label}</div>
                  </div>
                </div>
              );
            })}
            <div className="problem-arrow">
              <ArrowRight size={28} />
            </div>
            <div className="problem-icon highlight">
              <div>
                YOMI
                <br />
                Script
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
