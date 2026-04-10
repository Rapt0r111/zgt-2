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
  { href: "/",                  label: "Дашборд",           icon: LayoutDashboard, minRole: "user"  },
  { href: "/personnel",         label: "Личный состав",     icon: Users,           minRole: "user"  },
  { href: "/phones",            label: "Телефоны",          icon: Smartphone,      minRole: "user"  },
  { href: "/equipment",         label: "Техника",           icon: Monitor,         minRole: "user"  },
  { href: "/storage-and-passes",label: "Носители и пропуска", icon: Shield,        minRole: "user"  },
  { href: "/users",             label: "Пользователи",      icon: UserCog,         minRole: "admin" },
] as const;

const ROLE_PRIORITY: Record<string, number> = {
  admin: 100, officer: 50, operator: 20, user: 10,
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор", officer: "Офицер",
  operator: "Оператор",   user: "Пользователь",
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

  const displayUsername = emailToUsername(user.email);
  const initials = displayUsername.slice(0, 2).toUpperCase();

  // Hue derived from name for avatar color
  const nameHue = (user.name.charCodeAt(0) * 37) % 360;

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Aurora background glows ─────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="aurora-glow-blue"
          style={{ top: "-30%", left: "-15%", width: "55%", height: "70%",
            animation: "aurora-float 8s ease-in-out infinite" }}
        />
        <div
          className="aurora-glow-violet"
          style={{ top: "25%", right: "-10%", width: "45%", height: "55%",
            animation: "aurora-float 11s ease-in-out infinite reverse" }}
        />
      </div>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 relative z-10"
        style={{
          background: "linear-gradient(180deg, hsl(220 40% 8%) 0%, hsl(220 47% 4%) 100%)",
          borderRight: "1px solid hsl(220 30% 12%)",
        }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b"
          style={{ borderColor: "hsl(220 30% 12%)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, hsl(217 91% 60%), hsl(258 90% 66%))",
                boxShadow: "0 0 20px hsl(217 91% 60% / 0.4)",
              }}
            >
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[13px] font-700 leading-tight"
                style={{ color: "hsl(220 50% 95%)", fontWeight: 700 }}
              >
                ЗГТ Система
              </p>
              <p className="text-[10px] mt-0.5"
                style={{ color: "hsl(215 16% 40%)" }}
              >
                Управление имуществом
              </p>
            </div>
          </div>
          {/* Live status */}
          <div className="live-dot mt-3 text-[11px] font-medium"
            style={{ color: "hsl(160 84% 55%)" }}
          >
            Система активна
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-0.5" aria-label="Основная навигация">
          <p className="px-3 mb-2 text-[10px] font-600 uppercase tracking-widest"
            style={{ color: "hsl(215 16% 30%)", fontWeight: 600 }}
          >
            Навигация
          </p>
          {visibleNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* User card */}
        <div className="px-3 py-4 border-t" style={{ borderColor: "hsl(220 30% 12%)" }}>
          <div className="glass rounded-xl p-3 flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-700 text-white shrink-0"
              style={{
                background: `hsl(${nameHue} 55% 48%)`,
                fontWeight: 700,
              }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-500 truncate"
                style={{ color: "hsl(220 50% 95%)", fontWeight: 500 }}
              >
                {user.name}
              </p>
              <p className="text-[11px] truncate"
                style={{ color: "hsl(215 16% 40%)" }}
              >
                {ROLE_LABELS[user.role] ?? user.role}
              </p>
            </div>
            <form action="/api/auth/sign-out" method="POST">
              <button
                type="submit"
                className="p-1.5 rounded-md transition-colors"
                style={{ color: "hsl(215 16% 40%)" }}
                aria-label="Выйти"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-6 py-3 sticky top-0 z-40 topbar-glass">
          <div className="flex-1" />
          <CommandPalette />
        </header>

        <main className="flex-1 overflow-auto scrollbar-aurora">
          {children}
        </main>
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
        "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-200",
        "text-[hsl(215_16%_46%)] hover:text-[hsl(220_50%_90%)] hover:bg-[hsl(220_30%_13%)]"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 font-500" style={{ fontWeight: 500 }}>
        {item.label}
      </span>
      <ChevronRight
        className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity"
      />
    </Link>
  );
}