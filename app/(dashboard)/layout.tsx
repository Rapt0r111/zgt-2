/**
 * Updated app/(dashboard)/layout.tsx
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Users, Smartphone, Monitor, Shield, UserCog, LayoutDashboard, LogOut,
} from "lucide-react";
import { getCurrentUser, emailToUsername } from "@/lib/auth.server";
import { CommandPalette } from "@/components/search/CommandPalette";
import { NavLink } from "@/components/ui/NavLink";

export const metadata: Metadata = {
  title: { template: "%s — ЗГТ", default: "ЗГТ" },
};

const NAV_ITEMS = [
  { href: "/", label: "Дашборд", icon: "LayoutDashboard", minRole: "user" },
  { href: "/personnel", label: "Личный состав", icon: "Users", minRole: "user" },
  { href: "/phones", label: "Телефоны", icon: "Smartphone", minRole: "user" },
  { href: "/equipment", label: "Техника", icon: "Monitor", minRole: "user" },
  { href: "/storage-and-passes", label: "Носители и пропуска", icon: "Shield", minRole: "user" },
  { href: "/users", label: "Пользователи", icon: "UserCog", minRole: "admin" },
] as const;

const ROLE_PRIORITY: Record<string, number> = { admin: 100, officer: 50, operator: 20, user: 10 };
const ROLE_LABELS: Record<string, string> = { admin: "Администратор", officer: "Офицер", operator: "Оператор", user: "Пользователь" };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userPriority = ROLE_PRIORITY[user.role] ?? 0;
  const visibleNavItems = NAV_ITEMS.filter(item => userPriority >= (ROLE_PRIORITY[item.minRole] ?? 0));

  const displayUsername = emailToUsername(user.email);
  const initials = displayUsername.slice(0, 2).toUpperCase();
  const nameHue = (user.name.charCodeAt(0) * 37) % 360;

  return (
    <div className="flex min-h-screen" style={{ background: "#060C18" }}>

      {/* Aurora ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute rounded-full" style={{
          top: "-30%", left: "-15%", width: "55%", height: "70%",
          background: "radial-gradient(ellipse,rgba(59,130,246,0.08) 0%,transparent 70%)",
          animation: "aurora-float 8s ease-in-out infinite",
        }} />
        <div className="absolute rounded-full" style={{
          top: "25%", right: "-10%", width: "45%", height: "55%",
          background: "radial-gradient(ellipse,rgba(139,92,246,0.06) 0%,transparent 70%)",
          animation: "aurora-float 11s ease-in-out infinite reverse",
        }} />
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: `linear-gradient(rgba(59,130,246,1) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,1) 1px,transparent 1px)`,
          backgroundSize: "48px 48px",
        }} />
      </div>

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-[220px] shrink-0 relative z-10" style={{
        background: "linear-gradient(180deg,#0B1426 0%,#060C18 100%)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
      }}>
        {/* Logo */}
        <div className="px-5 py-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center mb-3" style={{
            background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
            boxShadow: "0 0 20px rgba(59,130,246,0.4)",
          }}>
            <Shield className="w-[18px] h-[18px] text-white" />
          </div>
          <p className="text-[15px] font-bold leading-tight" style={{ color: "#F0F4FF", letterSpacing: "-0.3px" }}>
            ЗГТ Система
          </p>
          <p className="text-[11px] mt-0.5 uppercase tracking-[0.5px]" style={{ color: "#4A5568" }}>
            Управление имуществом
          </p>
          <div className="live-dot mt-2.5 text-[11px] font-medium" style={{ color: "#10B981" }}>
            Система активна
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 pt-4 pb-2" aria-label="Основная навигация">
          <p className="px-5 mb-2 text-[10px] font-semibold uppercase tracking-[1px]" style={{ color: "#4A5568" }}>
            Навигация
          </p>
          {visibleNavItems.map(item => (
            <NavLink
              key={item.href}
              item={item}
            />
          ))}
        </nav>

        {/* User card */}
        <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="rounded-[10px] p-3 flex items-center gap-2.5" style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: `hsl(${nameHue} 55% 48%)` }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate" style={{ color: "#F0F4FF" }}>{user.name}</p>
              <p className="text-[11px] truncate" style={{ color: "#4A5568" }}>{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
            <form action="/api/auth/sign-out" method="POST">
              <button type="submit" className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                style={{ color: "#4A5568" }} aria-label="Выйти">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">

        {/* Topbar */}
        <header className="flex items-center gap-4 px-7 py-4 sticky top-0 z-40" style={{
          background: "rgba(6,12,24,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}>
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