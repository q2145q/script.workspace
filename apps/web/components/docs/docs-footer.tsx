import Link from "next/link";

export function DocsFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--l-border)",
        padding: "3rem 0",
      }}
    >
      <div className="docs-container">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1.5rem",
          }}
        >
          <div style={{ color: "var(--l-text-muted)", fontSize: "0.8rem" }}>
            &copy; {new Date().getFullYear()} YOMI Script
          </div>
          <nav
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1.5rem",
              fontSize: "0.8rem",
            }}
          >
            <Link
              href="/"
              style={{ color: "var(--l-text-muted)", textDecoration: "none" }}
            >
              Главная
            </Link>
            <Link
              href="/tutorial"
              style={{ color: "var(--l-text-muted)", textDecoration: "none" }}
            >
              Руководство
            </Link>
            <Link
              href="/docs"
              style={{ color: "var(--l-text-muted)", textDecoration: "none" }}
            >
              Документация
            </Link>
            <Link
              href="/privacy"
              style={{ color: "var(--l-text-muted)", textDecoration: "none" }}
            >
              Конфиденциальность
            </Link>
            <Link
              href="/terms"
              style={{ color: "var(--l-text-muted)", textDecoration: "none" }}
            >
              Условия
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
