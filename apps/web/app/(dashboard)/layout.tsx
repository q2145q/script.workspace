import { redirect } from "next/navigation";
import { auth } from "@script/api/auth";
import { prisma } from "@script/db";
import { headers } from "next/headers";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/dashboard/notification-bell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const t = await getTranslations("Auth");

  // Beta gate
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { betaApproved: true, banned: true },
  });

  if (user?.banned) {
    return (
      <div className="min-h-screen bg-background">
        <header className="glass-panel sticky top-0 z-30 border-b border-border">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <span className="text-lg font-semibold text-foreground">YOMI Script</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{session.user.name}</span>
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
        </header>
        <main className="flex min-h-[80vh] items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-3">
              {t("accountBannedTitle", { defaultMessage: "Account suspended" })}
            </h1>
            <p className="text-muted-foreground">
              {t("accountBannedDescription", { defaultMessage: "Your account has been suspended. Please contact support for more information." })}
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!user?.betaApproved) {
    return (
      <div className="min-h-screen bg-background">
        <header className="glass-panel sticky top-0 z-30 border-b border-border">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <span className="text-lg font-semibold text-foreground">YOMI Script</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{session.user.name}</span>
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
        </header>
        <main className="flex min-h-[80vh] items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-3">
              {t("betaQueueTitle")}
            </h1>
            <p className="text-muted-foreground">
              {t("betaQueueDescription")}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-panel sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/dashboard" className="text-lg font-semibold text-foreground">
            YOMI Script
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/profile"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              {session.user.name}
            </Link>
            <NotificationBell />
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-4 sm:py-8">{children}</main>
    </div>
  );
}
