import { redirect } from "next/navigation";
import { validateSession } from "@/lib/auth";
import Link from "next/link";
import { AdminNav } from "./nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isValid = await validateSession();
  if (!isValid) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-card p-4 flex flex-col">
        <h2 className="mb-6 text-lg font-bold text-foreground px-2">
          Admin Panel
        </h2>
        <AdminNav />
        <div className="mt-auto pt-4 border-t border-border">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        const { destroySession } = await import("@/lib/auth");
        await destroySession();
        redirect("/login");
      }}
    >
      <button type="submit" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2">
        Выйти
      </button>
    </form>
  );
}
