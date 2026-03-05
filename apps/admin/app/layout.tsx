import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Script Workspace — Админ-панель",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
