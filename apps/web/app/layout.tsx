import { getLocale } from "next-intl/server";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["cyrillic", "latin"],
  variable: "--font-sans",
  display: "swap",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={geist.variable} suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
