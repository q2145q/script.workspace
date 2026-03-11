"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export function DocsHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: "/tutorial", label: "Руководство" },
    { href: "/docs", label: "Документация" },
  ];

  return (
    <header className="landing-header scrolled" style={{ position: "fixed" }}>
      <div className="landing-container">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "56px",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              textDecoration: "none",
              color: "var(--l-text)",
              fontWeight: 700,
              fontSize: "1.1rem",
              letterSpacing: "-0.01em",
            }}
          >
            YOMI Script
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="landing-nav-link"
                style={
                  pathname === link.href
                    ? { color: "var(--l-accent)" }
                    : undefined
                }
              >
                {link.label}
              </Link>
            ))}
            <Link href="/sign-in" className="btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}>
              Войти
            </Link>
          </nav>

          <button
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              background: "none",
              border: "none",
              color: "var(--l-text)",
              cursor: "pointer",
            }}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="landing-mobile-menu">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={
                pathname === link.href
                  ? { color: "var(--l-accent)" }
                  : undefined
              }
            >
              {link.label}
            </Link>
          ))}
          <Link href="/sign-in" onClick={() => setMobileOpen(false)}>
            Войти
          </Link>
        </div>
      )}
    </header>
  );
}
