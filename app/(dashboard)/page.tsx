import type { Metadata, Route } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  Users, Smartphone, Monitor, Shield, AlertTriangle, ArrowRight,
} from "lucide-react";
import { db } from "@/db";
import { personnel, phones, equipment, storageItems } from "@/db/schema";
import { eq, isNull, count, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth.server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Дашборд — ЗГТ" };

async function fetchDashboardStats() {
  const [personnelStats, phoneStats, equipmentStats, storageStats, notSubmittedPhones] =
    await Promise.all([
      db.select({ status: personnel.status, cnt: count() })
        .from(personnel).where(isNull(personnel.deletedAt)).groupBy(personnel.status),
      db.select({ status: phones.status, cnt: count() })
        .from(phones).where(isNull(phones.deletedAt)).groupBy(phones.status),
      db.select({ status: equipment.status, cnt: count() })
        .from(equipment)
        .where(and(isNull(equipment.deletedAt), eq(equipment.isPersonal, false)))
        .groupBy(equipment.status),
      db.select({ status: storageItems.status, cnt: count() })
        .from(storageItems).where(isNull(storageItems.deletedAt)).groupBy(storageItems.status),
      db.select({ lastName: personnel.lastName, firstName: personnel.firstName, rank: personnel.rank, id: personnel.id })
        .from(phones)
        .innerJoin(personnel, eq(phones.personnelId, personnel.id))
        .where(and(eq(phones.status, "checked_out"), isNull(phones.deletedAt), eq(personnel.status, "active")))
        .limit(10),
    ]);

  const personnelTotal = personnelStats.reduce((s, r) => s + Number(r.cnt), 0);
  const personnelActive = Number(personnelStats.find((r) => r.status === "active")?.cnt ?? 0);
  const phonesTotal = phoneStats.reduce((s, r) => s + Number(r.cnt), 0);
  const phonesCheckedIn = Number(phoneStats.find((r) => r.status === "checked_in")?.cnt ?? 0);
  const phonesNotSubmitted = Number(phoneStats.find((r) => r.status === "checked_out")?.cnt ?? 0);
  const equipmentTotal = equipmentStats.reduce((s, r) => s + Number(r.cnt), 0);
  const equipmentInUse = Number(equipmentStats.find((r) => r.status === "in_use")?.cnt ?? 0);
  const storageInUse = Number(storageStats.find((r) => r.status === "in_use")?.cnt ?? 0);
  const storageTotal = storageStats.reduce((s, r) => s + Number(r.cnt), 0);

  return {
    personnel: { total: personnelTotal, active: personnelActive },
    phones: { total: phonesTotal, checkedIn: phonesCheckedIn, notSubmitted: phonesNotSubmitted },
    equipment: { total: equipmentTotal, inUse: equipmentInUse },
    storage: { total: storageTotal, inUse: storageInUse },
    notSubmittedPhones,
  };
}

/* ── Bento stat card ───────────────────────────────────────────────────────── */

function StatCard({
  title, value, sub, subValue, icon: Icon, iconBg, iconColor, accentColor, progressPct, href, alert, delay,
}: {
  title: string;
  value: number;
  sub: string;
  subValue?: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; // <-- Исправлено здесь
  iconBg: string;
  iconColor: string;
  accentColor: string;
  progressPct: number;
  href: string;
  alert?: boolean;
  delay?: string;
}) {
  return (
    <Link
      href={href as Route}
      className={cn(
        "group relative rounded-[14px] p-[18px] cursor-pointer",
        "transition-all duration-300 overflow-hidden",
        "animate-fade-up",
        delay,
      )}
      style={{
        background: alert ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.04)",
        border: alert ? "1px solid rgba(245,158,11,0.25)" : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[14px]"
        style={{
          background: "radial-gradient(circle at 50% 0%, rgba(59,130,246,0.1), transparent 60%)",
        }}
      />

      {/* Icon badge */}
      <div
        className="absolute right-[14px] top-[14px] w-8 h-8 rounded-lg flex items-center justify-center opacity-80"
        style={{ background: iconBg }}
      >
        <Icon className="w-4 h-4" style={{ color: iconColor } as React.CSSProperties} />
      </div>

      <p
        className="text-[11px] font-medium uppercase tracking-[0.8px] mb-2.5"
        style={{ color: "#4A5568" }}
      >
        {title}
      </p>

      <p
        className="text-[28px] font-bold tabular-nums leading-none"
        style={{ color: accentColor, letterSpacing: "-1px" }}
      >
        {value}
      </p>

      <p className="text-[12px] mt-1.5 flex items-center gap-1" style={{ color: "#94A3B8" }}>
        {subValue && (
          <span className="font-semibold" style={{ color: "#10B981" }}>{subValue}</span>
        )}
        {sub}
      </p>

      {/* Progress bar */}
      <div
        className="h-1 rounded-full mt-3 overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(100, progressPct)}%`,
            background: accentColor,
          }}
        />
      </div>

      {/* Bottom right arrow */}
      <ArrowRight
        className="absolute bottom-3.5 right-3.5 w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity"
        style={{ color: accentColor } as React.CSSProperties}
      />
    </Link>
  );
}

/* ── Progress bar util ─────────────────────────────────────────────────────── */

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

/* ── Dashboard content ─────────────────────────────────────────────────────── */

async function DashboardContent() {
  const stats = await fetchDashboardStats();

  return (
    <div className="space-y-6">

      {/* Alert */}
      {stats.phones.notSubmitted > 0 && (
        <div
          className="rounded-[10px] px-4 py-3 flex items-start gap-3 animate-fade-up"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
            animationDelay: "0.3s",
          }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#FCD34D" }} />
          <div className="flex-1">
            <p className="text-[13px] font-semibold" style={{ color: "#FCD34D" }}>
              {stats.phones.notSubmitted}{" "}
              {stats.phones.notSubmitted === 1
                ? "военнослужащий не сдал телефон"
                : "военнослужащих не сдали телефон"}
            </p>
            {stats.notSubmittedPhones.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {stats.notSubmittedPhones.map((p) => (
                  <li key={p.id} className="text-[12px]" style={{ color: "rgba(252,211,77,0.7)" }}>
                    {p.rank} {p.lastName} {p.firstName}
                  </li>
                ))}
                {stats.phones.notSubmitted > 10 && (
                  <li className="text-[12px] italic" style={{ color: "rgba(252,211,77,0.5)" }}>
                    и ещё {stats.phones.notSubmitted - 10} чел.
                  </li>
                )}
              </ul>
            )}
            <Link
              href={"/phones" as Route}
              className="inline-flex items-center gap-1 mt-2 text-xs font-medium underline underline-offset-2"
              style={{ color: "rgba(252,211,77,0.8)" }}
            >
              Перейти к телефонам
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Bento stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Личный состав"
          value={stats.personnel.total}
          sub="в строю"
          subValue={`${stats.personnel.active}`}
          icon={Users}
          iconBg="rgba(59,130,246,0.12)"
          iconColor="#60A5FA"
          accentColor="#F0F4FF"
          progressPct={Math.round((stats.personnel.active / Math.max(1, stats.personnel.total)) * 100)}
          href="/personnel"
          delay="delay-1"
        />
        <StatCard
          title="Телефоны"
          value={stats.phones.total}
          sub="сдано"
          subValue={`${stats.phones.checkedIn}`}
          icon={Smartphone}
          iconBg="rgba(16,185,129,0.12)"
          iconColor="#34D399"
          accentColor={stats.phones.notSubmitted > 0 ? "#FCD34D" : "#F0F4FF"}
          progressPct={Math.round((stats.phones.checkedIn / Math.max(1, stats.phones.total)) * 100)}
          href="/phones"
          alert={stats.phones.notSubmitted > 0}
          delay="delay-2"
        />
        <StatCard
          title="Техника"
          value={stats.equipment.total}
          sub="в работе"
          subValue={`${stats.equipment.inUse}`}
          icon={Monitor}
          iconBg="rgba(139,92,246,0.12)"
          iconColor="#A78BFA"
          accentColor="#F0F4FF"
          progressPct={Math.round((stats.equipment.inUse / Math.max(1, stats.equipment.total)) * 100)}
          href="/equipment"
          delay="delay-3"
        />
        <StatCard
          title="Носители и пропуска"
          value={stats.storage.total}
          sub="выдано"
          subValue={`${stats.storage.inUse}`}
          icon={Shield}
          iconBg="rgba(6,182,212,0.12)"
          iconColor="#67E8F9"
          accentColor="#F0F4FF"
          progressPct={Math.round((stats.storage.inUse / Math.max(1, stats.storage.total)) * 100)}
          href="/storage-and-passes"
          delay="delay-4"
        />
      </div>

      {/* Secondary detail panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Equipment breakdown */}
        <div
          className="rounded-[16px] p-5 animate-fade-up delay-3"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#3B82F6", boxShadow: "0 0 8px #3B82F6" }}
            />
            <h3 className="text-[13px] font-semibold" style={{ color: "#94A3B8" }}>
              Техника по статусам
            </h3>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
          </div>
          <div className="space-y-3.5">
            {[
              { label: "В работе", value: stats.equipment.inUse, color: "#10B981", glow: true },
              { label: "На складе", value: stats.equipment.total - stats.equipment.inUse, color: "#60A5FA", glow: false },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: "#4A5568" }}>{item.label}</span>
                  <span className="text-xs font-semibold tabular-nums" style={{ color: item.color }}>
                    {item.value}
                  </span>
                </div>
                <ProgressBar value={item.value} total={stats.equipment.total} color={item.color} />
              </div>
            ))}
          </div>
        </div>

        {/* Personnel breakdown */}
        <div
          className="rounded-[16px] p-5 animate-fade-up delay-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#3B82F6", boxShadow: "0 0 8px #3B82F6" }}
            />
            <h3 className="text-[13px] font-semibold" style={{ color: "#94A3B8" }}>
              Личный состав
            </h3>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
          </div>
          <div className="space-y-3.5">
            {[
              { label: "В строю", value: stats.personnel.active, color: "#10B981" },
              { label: "Остальные", value: stats.personnel.total - stats.personnel.active, color: "#4A5568" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: "#4A5568" }}>{item.label}</span>
                  <span className="text-xs font-semibold tabular-nums" style={{ color: item.color }}>
                    {item.value}
                  </span>
                </div>
                <ProgressBar value={item.value} total={stats.personnel.total} color={item.color} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="container mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8 animate-fade-up">
        <h1
          className="text-[22px] font-bold"
          style={{ color: "#F0F4FF", letterSpacing: "-0.5px" }}
        >
          Добро пожаловать{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#4A5568" }}>
          Обзор системы учёта личного состава и техники
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 rounded-[14px] skeleton" />
            ))}
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </div>
  );
}