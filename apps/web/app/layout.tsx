import type { Metadata } from "next";
import { Toaster } from "sonner";
import { TRPCReactProvider } from "@/lib/trpc/client";
import "./globals.css";

export const metadata: Metadata = {
  title: "Script Workspace",
  description: "AI-powered screenwriting platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <TRPCReactProvider>
          {children}
          <Toaster position="bottom-right" />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
