"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";

export function Footer() {
  const t = useTranslations("Landing.footer");

  return (
    <footer className="landing-footer">
      <div className="landing-container">
        {/* 4-column grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: "2rem",
          }}
          className="footer-grid"
        >
          {/* Column 1: Logo + tagline */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/yomi-light.svg" alt="YOMI" className="h-7 w-auto" />
              <span
                style={{
                  fontSize: "0.65rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: 500,
                }}
              >
                Script
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginBottom: "1rem" }}>
              {t("tagline")}
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://t.me/yaborovkov"
                target="_blank"
                rel="noopener noreferrer"
              >
                Telegram
              </a>
            </div>
          </div>

          {/* Column 2: Product */}
          <div>
            <h4 className="footer-heading">{t("product")}</h4>
            <nav style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <Link href="#features">{t("features")}</Link>
              <Link href="#pricing">{t("pricing")}</Link>
              <Link href="/docs">{t("docs")}</Link>
              <a href="#">{t("changelog")}</a>
            </nav>
          </div>

          {/* Column 3: Company */}
          <div>
            <h4 className="footer-heading">{t("company")}</h4>
            <nav style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <a href="#">{t("about")}</a>
              <a href="#">{t("blog")}</a>
            </nav>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h4 className="footer-heading">{t("legal")}</h4>
            <nav style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <a href="#">{t("privacy")}</a>
              <a href="#">{t("terms")}</a>
              <a href="#">{t("cookies")}</a>
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            marginTop: "3rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
            {t("copyright")}
          </p>
          <div className="flex items-center gap-4">
            <LocaleSwitcher />
            <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.3)" }}>
              {t("bottomLine")}
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 767px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 480px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}
