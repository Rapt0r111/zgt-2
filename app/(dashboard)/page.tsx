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
    phones:    { total: phonesTotal, checkedIn: phonesCheckedIn, notSubmitted: phonesNotSubmitted },
    equipment: { total: equipmentTotal, inUse: equipmentInUse },
    storage:   { total: storageTotal, inUse: storageInUse },
    notSubmittedPhones,
  };
}

/* ── Stat card ─────────────────────────────────────────────────────────────── */

function StatCard({
  title, value, sub, icon: Icon, href, alert,
}: {
  title: string; value: number; sub: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string; alert?: boolean;
}) {
  return (
    <Link
      href={href as Route}
      className={cn(
        "group glass glass-hover rounded-2xl p-5 flex flex-col gap-4 animate-fade-up",
        alert && "border-[hsl(38_92%_50%/0.25)] bg-[hsl(38_92%_50%/0.06)]"
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            alert
              ? "bg-[hsl(38_92%_50%/0.12)] text-[hsl(38_92%_68%)]"
              : "bg-[hsl(217_91%_60%/0.12)] text-[hsl(213_100%_68%)]"
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
      </div>
      <div>
        <p className="text-[28px] font-bold tabular-nums leading-none" style={{ letterSpacing: "-1px" }}>
          {value}
        </p>
        <p className="text-[13px] font-500 mt-1" style={{ fontWeight: 500 }}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </Link>
  );
}

/* ── Progress bar ──────────────────────────────────────────────────────────── */

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
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
        <div className="alert-warning rounded-xl px-4 py-3 flex items-start gap-3 animate-fade-up">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-600" style={{ fontWeight: 600 }}>
              {stats.phones.notSubmitted}{" "}
              {stats.phones.notSubmitted === 1
                ? "военнослужащий не сдал телефон"
                : "военнослужащих не сдали телефон"}
            </p>
            {stats.notSubmittedPhones.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {stats.notSubmittedPhones.map((p) => (
                  <li key={p.id} className="text-xs opacity-80">
                    {p.rank} {p.lastName} {p.firstName}
                  </li>
                ))}
                {stats.phones.notSubmitted > 10 && (
                  <li className="text-xs opacity-60 italic">
                    и ещё {stats.phones.notSubmitted - 10} чел.
                  </li>
                )}
              </ul>
            )}
            <Link
              href={"/phones" as Route}
              className="inline-flex items-center gap-1 mt-2 text-xs font-medium opacity-80 hover:opacity-100 underline underline-offset-2"
            >
              Перейти к телефонам
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Stat cards bento grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Личный состав"
          value={stats.personnel.total}
          sub={`${stats.personnel.active} в строю`}
          icon={Users}
          href="/personnel"
        />
        <StatCard
          title="Телефоны"
          value={stats.phones.total}
          sub={`${stats.phones.checkedIn} сдано`}
          icon={Smartphone}
          href="/phones"
          alert={stats.phones.notSubmitted > 0}
        />
        <StatCard
          title="Техника"
          value={stats.equipment.total}
          sub={`${stats.equipment.inUse} в работе`}
          icon={Monitor}
          href="/equipment"
        />
        <StatCard
          title="Носители и пропуска"
          value={stats.storage.total}
          sub={`${stats.storage.inUse} выдано`}
          icon={Shield}
          href="/storage-and-passes"
        />
      </div>

      {/* Secondary detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Equipment breakdown */}
        <div className="glass rounded-2xl p-5 animate-fade-up delay-3">
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-600" style={{ fontWeight: 600 }}>
              Техника по статусам
            </h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "В работе",  value: stats.equipment.inUse, color: "hsl(160 84% 45%)" },
              { label: "На складе", value: stats.equipment.total - stats.equipment.inUse, color: "hsl(213 100% 68%)" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs font-600 tabular-nums" style={{ fontWeight: 600, color: item.color }}>
                    {item.value}
                  </span>
                </div>
                <ProgressBar value={item.value} total={stats.equipment.total} color={item.color} />
              </div>
            ))}
          </div>
        </div>

        {/* Personnel breakdown */}
        <div className="glass rounded-2xl p-5 animate-fade-up delay-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-600" style={{ fontWeight: 600 }}>
              Личный состав
            </h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "В строю",    value: stats.personnel.active, color: "hsl(160 84% 45%)" },
              { label: "Остальные",  value: stats.personnel.total - stats.personnel.active, color: "hsl(215 16% 46%)" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs font-600 tabular-nums" style={{ fontWeight: 600, color: item.color }}>
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
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 animate-fade-up">
        <h1 className="text-[22px] font-bold" style={{ letterSpacing: "-0.5px" }}>
          Добро пожаловать{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Обзор системы учёта личного состава и техники
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 rounded-2xl skeleton" />
            ))}
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </div>
  );
}