"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Key, Cpu, Users, BarChart3, FileText, MessageSquare } from "lucide-react";

const links = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/api-keys", label: "API Ключи", icon: Key },
  { href: "/models", label: "Модели", icon: Cpu },
  { href: "/users", label: "Пользователи", icon: Users },
  { href: "/usage", label: "Использование", icon: BarChart3 },
  { href: "/ai-logs", label: "AI Logs", icon: FileText },
  { href: "/reports", label: "Обращения", icon: MessageSquare },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {links.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? "bg-accent/15 text-accent font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
