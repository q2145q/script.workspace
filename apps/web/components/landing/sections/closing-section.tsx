"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useInView } from "../hooks";

export function ClosingSection() {
  const tFaq = useTranslations("Landing.faq");
  const tCta = useTranslations("Landing.cta");
  const tFooter = useTranslations("Landing.footer");
  const [faqRef, faqVisible] = useInView();
  const [ctaRef, ctaVisible] = useInView();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const faqItems = Array.from({ length: 9 }, (_, i) => ({
    q: tFaq(`q${i + 1}`),
    a: tFaq(`a${i + 1}`),
  }));

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
              {tFaq("title")}
            </h2>
          </div>

          <div className={`reveal ${faqVisible ? "visible" : ""}`}>
            {faqItems.map((item, i) => (
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
              {tCta("title1")}
            </h2>

            <p
              className="text-base mb-8 leading-relaxed"
              style={{ color: "var(--l-text-dim)", maxWidth: 480 }}
            >
              {tCta("description")}
            </p>

            <Link href="/sign-up" className="btn-primary">
              {tCta("button")}
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
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/yomi-light.svg" alt="YOMI" className="h-6 w-auto" />
              <span
                style={{
                  fontSize: "0.6rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--l-text-muted)",
                }}
              >
                Script
              </span>
            </div>

            <nav className="flex flex-wrap items-center gap-5 text-sm">
              <button
                onClick={() => scrollTo("pricing")}
                className="landing-nav-link"
              >
                {tFooter("pricing")}
              </button>
              <Link href="/docs" className="landing-nav-link">
                {tFooter("docs")}
              </Link>
              <Link href="/sign-in" className="landing-nav-link">
                {tFooter("signIn")}
              </Link>
              <Link href="/sign-up" className="landing-nav-link">
                {tFooter("signUp")}
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
              {tFooter("copyright")}
              {" · "}
              {tFooter("security")}
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
