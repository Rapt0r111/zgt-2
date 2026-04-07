import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import {
  Users,
  Smartphone,
  Monitor,
  Shield,
  UserCog,
  LayoutDashboard,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { getCurrentUser, emailToUsername } from "@/lib/auth.server";
import { CommandPalette } from "@/components/search/CommandPalette";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    template: "%s — ЗГТ",
    default: "ЗГТ",
  },
};

const NAV_ITEMS = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard, minRole: "user" },
  { href: "/personnel", label: "Личный состав", icon: Users, minRole: "user" },
  { href: "/phones", label: "Телефоны", icon: Smartphone, minRole: "user" },
  { href: "/equipment", label: "Техника", icon: Monitor, minRole: "user" },
  {
    href: "/storage-and-passes",
    label: "Носители и пропуска",
    icon: Shield,
    minRole: "user",
  },
  { href: "/users", label: "Пользователи", icon: UserCog, minRole: "admin" },
] as const;

const ROLE_PRIORITY: Record<string, number> = {
  admin: 100,
  officer: 50,
  operator: 20,
  user: 10,
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  officer: "Офицер",
  operator: "Оператор",
  user: "Пользователь",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const userPriority = ROLE_PRIORITY[user.role] ?? 0;
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => userPriority >= (ROLE_PRIORITY[item.minRole] ?? 0)
  );

  // Display the username part, not the @zgt.local email
  const displayUsername = emailToUsername(user.email);
  const initials = displayUsername.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card shrink-0">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">
              ЗГТ Система
            </p>
            <p className="text-xs text-muted-foreground">Управление имуществом</p>
          </div>
        </div>

        <nav
          className="flex-1 px-3 py-4 space-y-0.5"
          aria-label="Основная навигация"
        >
          {visibleNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <span className="text-xs font-medium">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABELS[user.role] ?? user.role}
              </p>
            </div>
            <form action="/api/auth/sign-out" method="POST">
              <button
                type="submit"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Выйти"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-4 px-6 py-3 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex-1" />
          <CommandPalette />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  item,
}: {
  item: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  };
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href as Route}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md",
        "text-sm text-muted-foreground",
        "hover:text-foreground hover:bg-muted",
        "transition-colors group"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </Link>
  );
}