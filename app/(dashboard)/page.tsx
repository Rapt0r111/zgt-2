/**
 * / — Dashboard home page
 *
 * Shows:
 *  - Summary stats for all modules
 *  - Notifications (кто не сдал телефон)
 *  - Quick links
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  Users,
  Smartphone,
  Monitor,
  Shield,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { db } from "@/db";
import {
  personnel,
  phones,
  equipment,
  storageItems,
} from "@/db/schema";
import { eq, isNull, count, and, ne } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth.server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Дашборд — ЗГТ",
};

// ── Stats fetching — parallel, no waterfall ──────────────────────────────────
async function fetchDashboardStats() {
  const [
    personnelStats,
    phoneStats,
    equipmentStats,
    storageStats,
    notSubmittedPhones,
  ] = await Promise.all([
    // Personnel count by status
    db
      .select({ status: personnel.status, cnt: count() })
      .from(personnel)
      .where(isNull(personnel.deletedAt))
      .groupBy(personnel.status),

    // Phone checkin stats
    db
      .select({ status: phones.status, cnt: count() })
      .from(phones)
      .where(isNull(phones.deletedAt))
      .groupBy(phones.status),

    // Equipment status
    db
      .select({ status: equipment.status, cnt: count() })
      .from(equipment)
      .where(and(isNull(equipment.deletedAt), eq(equipment.isPersonal, false)))
      .groupBy(equipment.status),

    // Storage items
    db
      .select({ status: storageItems.status, cnt: count() })
      .from(storageItems)
      .where(isNull(storageItems.deletedAt))
      .groupBy(storageItems.status),

    // Who hasn't submitted their phone
    db
      .select({
        lastName: personnel.lastName,
        firstName: personnel.firstName,
        rank: personnel.rank,
        id: personnel.id,
      })
      .from(phones)
      .innerJoin(personnel, eq(phones.personnelId, personnel.id))
      .where(
        and(
          eq(phones.status, "checked_out"),
          isNull(phones.deletedAt),
          eq(personnel.status, "active")
        )
      )
      .limit(10),
  ]);

  const personnelTotal = personnelStats.reduce(
    (s, r) => s + Number(r.cnt),
    0
  );
  const personnelActive =
    personnelStats.find((r) => r.status === "active")?.cnt ?? 0;

  const phonesTotal = phoneStats.reduce((s, r) => s + Number(r.cnt), 0);
  const phonesCheckedIn =
    phoneStats.find((r) => r.status === "checked_in")?.cnt ?? 0;
  const phonesNotSubmitted =
    phoneStats.find((r) => r.status === "checked_out")?.cnt ?? 0;

  const equipmentTotal = equipmentStats.reduce(
    (s, r) => s + Number(r.cnt),
    0
  );
  const equipmentInUse =
    equipmentStats.find((r) => r.status === "in_use")?.cnt ?? 0;

  const storageInUse =
    storageStats.find((r) => r.status === "in_use")?.cnt ?? 0;
  const storageTotal = storageStats.reduce((s, r) => s + Number(r.cnt), 0);

  return {
    personnel: { total: personnelTotal, active: Number(personnelActive) },
    phones: {
      total: phonesTotal,
      checkedIn: Number(phonesCheckedIn),
      notSubmitted: Number(phonesNotSubmitted),
    },
    equipment: { total: equipmentTotal, inUse: Number(equipmentInUse) },
    storage: { total: storageTotal, inUse: Number(storageInUse) },
    notSubmittedPhones,
  };
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  href,
  alert,
}: {
  title: string;
  value: number;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-4 p-5 rounded-xl border bg-card",
        "hover:border-primary/50 hover:shadow-sm transition-all",
        alert && "border-destructive/30 bg-destructive/5"
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            alert
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </Link>
  );
}

// ── Dashboard content (async, streamed) ──────────────────────────────────────
async function DashboardContent() {
  const stats = await fetchDashboardStats();

  return (
    <div className="space-y-8">
      {/* Stats grid */}
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

      {/* Notification: phones not submitted */}
      {stats.phones.notSubmitted > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                {stats.phones.notSubmitted}{" "}
                {stats.phones.notSubmitted === 1
                  ? "военнослужащий не сдал телефон"
                  : stats.phones.notSubmitted < 5
                  ? "военнослужащих не сдали телефон"
                  : "военнослужащих не сдали телефон"}
              </p>
              {stats.notSubmittedPhones.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {stats.notSubmittedPhones.map((p) => (
                    <li key={p.id} className="text-xs text-amber-700 dark:text-amber-400">
                      {p.rank} {p.lastName} {p.firstName}
                    </li>
                  ))}
                  {stats.phones.notSubmitted > 10 && (
                    <li className="text-xs text-amber-600 dark:text-amber-500 italic">
                      и ещё {stats.phones.notSubmitted - 10} чел.
                    </li>
                  )}
                </ul>
              )}
              <Link
                href="/phones"
                className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
              >
                Перейти к телефонам
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">
          Добро пожаловать
          {user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Обзор системы учёта личного состава и техники
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-muted" />
            ))}
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </div>
  );
}
