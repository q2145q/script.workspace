"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";

export function Header({ scrolled }: { scrolled: boolean }) {
  const t = useTranslations("Landing.header");
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
              {t("features")}
            </button>
            <button
              onClick={() => scrollTo("pricing")}
              className="landing-nav-link"
            >
              {t("pricing")}
            </button>
            <Link href="/docs" className="landing-nav-link">
              {t("docs")}
            </Link>
            <Link href="/sign-in" className="landing-nav-link">
              {t("signIn")}
            </Link>
            <LocaleSwitcher />
            <Link href="/sign-up" className="btn-primary text-sm">
              {t("tryFree")}
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
            aria-label={t("menuLabel")}
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
            aria-label={t("closeLabel")}
          >
            <X size={22} />
          </button>
        </div>
        <button onClick={() => scrollTo("features")}>{t("features")}</button>
        <button onClick={() => scrollTo("pricing")}>{t("pricing")}</button>
        <Link href="/docs" onClick={() => setMobileOpen(false)}>
          {t("docs")}
        </Link>
        <Link href="/sign-in" onClick={() => setMobileOpen(false)}>
          {t("signIn")}
        </Link>
        <LocaleSwitcher />
        <Link
          href="/sign-up"
          className="btn-primary"
          onClick={() => setMobileOpen(false)}
          style={{ textAlign: "center", justifyContent: "center" }}
        >
          {t("tryFreeMobile")}
        </Link>
      </div>
    </>
  );
}
