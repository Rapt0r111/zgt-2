"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Users, Smartphone, Monitor, Shield, UserCog, LayoutDashboard } from "lucide-react";
import type { Route } from "next";

// Маппинг имен на компоненты иконок
const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Users, Smartphone, Monitor, Shield, UserCog
};

interface NavLinkProps {
  item: {
    href: string;
    label: string;
    icon: string; // Передаем имя иконки строкой
  };
}

export function NavLink({ item }: NavLinkProps) {
  const pathname = usePathname();
  const Icon = ICON_MAP[item.icon];
  const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

  if (isActive) {
    return (
      <div className="flex items-center gap-[10px] mx-2 px-3 py-[9px] rounded-lg text-[13.5px] relative"
        style={{ background: "linear-gradient(90deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))", color: "#60A5FA", borderLeft: "2px solid #3B82F6", marginLeft: "calc(8px - 2px)" }}>
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1 font-medium">{item.label}</span>
        <span className="w-1 h-1 rounded-full absolute right-3" style={{ background: "#3B82F6", boxShadow: "0 0 8px #3B82F6" }} />
      </div>
    );
  }

  return (
    <Link href={item.href as Route} className="group flex items-center gap-[10px] mx-2 px-3 py-[9px] rounded-lg text-[13.5px] transition-all duration-200 text-[#94A3B8] hover:text-[#F0F4FF] hover:bg-[rgba(255,255,255,0.04)] hover:translate-x-0.5">
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 font-medium">{item.label}</span>
      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
    </Link>
  );
}