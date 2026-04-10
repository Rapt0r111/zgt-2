/**
 * EquipmentStats — Aurora bento grid (Server Component)
 */

import { getEquipmentStats } from "@/lib/equipment.server";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label:    string;
  value:    number;
  total:    number;
  accent:   string;       /* hsl color string */
  bgAccent: string;       /* background hsl with opacity */
  delay:    string;
}

function StatCard({ label, value, total, accent, bgAccent, delay }: StatCardProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div
      className={cn("glass rounded-xl px-4 py-3.5 animate-fade-up", delay)}
      style={{ transition: "border-color 0.2s, background 0.2s" }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-medium" style={{ color: "hsl(215 16% 46%)" }}>
          {label}
        </span>
        <span
          className="text-xs font-600 tabular-nums"
          style={{ color: accent, fontWeight: 600 }}
        >
          {pct}%
        </span>
      </div>
      <div className="text-2xl font-bold tabular-nums" style={{ letterSpacing: "-0.5px", color: accent }}>
        {value}
      </div>
      {/* Mini progress */}
      <div className="h-1 rounded-full mt-2.5 overflow-hidden" style={{ background: "hsl(220 30% 12%)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: accent }}
        />
      </div>
    </div>
  );
}

function TotalCard({ value }: { value: number }) {
  return (
    <div className="glass rounded-xl px-4 py-3.5 animate-fade-up delay-1">
      <div className="text-xs font-medium mb-2.5" style={{ color: "hsl(215 16% 46%)" }}>
        Всего
      </div>
      <div
        className="text-2xl font-bold tabular-nums"
        style={{ color: "hsl(220 50% 95%)", letterSpacing: "-0.5px" }}
      >
        {value}
      </div>
      <div className="h-1 rounded-full mt-2.5" style={{ background: "hsl(220 30% 12%)" }}>
        <div className="h-full w-full rounded-full" style={{ background: "hsl(215 16% 30%)" }} />
      </div>
    </div>
  );
}

export async function EquipmentStats() {
  const stats = await getEquipmentStats();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <TotalCard value={stats.total} />

      <StatCard
        label="В работе"
        value={stats.inUse}
        total={stats.total}
        accent="hsl(160 84% 55%)"
        bgAccent="hsl(160 84% 55% / 0.1)"
        delay="delay-2"
      />
      <StatCard
        label="На складе"
        value={stats.storage}
        total={stats.total}
        accent="hsl(213 100% 68%)"
        bgAccent="hsl(213 100% 68% / 0.1)"
        delay="delay-3"
      />
      <StatCard
        label="В ремонте"
        value={stats.repair}
        total={stats.total}
        accent="hsl(38 92% 68%)"
        bgAccent="hsl(38 92% 68% / 0.1)"
        delay="delay-4"
      />
      <StatCard
        label="Сломано"
        value={stats.broken}
        total={stats.total}
        accent="hsl(0 72% 72%)"
        bgAccent="hsl(0 72% 72% / 0.1)"
        delay="delay-5"
      />
    </div>
  );
}