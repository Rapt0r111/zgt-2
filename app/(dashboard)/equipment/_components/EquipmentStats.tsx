/**
 * EquipmentStats — Aurora bento grid (Server Component)
 */

import { getEquipmentStats } from "@/lib/equipment.server";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label:   string;
  value:   number;
  total:   number;
  color:   string;      /* solid hex */
  bgColor: string;      /* rgba bg */
  delay:   string;
}

function StatCard({ label, value, total, color, bgColor, delay }: StatCardProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div
      className={cn("relative rounded-xl px-4 py-3.5 animate-fade-up group cursor-default", delay)}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        transition: "border-color 0.2s, background 0.2s, transform 0.2s",
      }}
      onMouseEnter={undefined}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span
          className="text-[11px] font-medium uppercase tracking-[0.8px]"
          style={{ color: "#4A5568" }}
        >
          {label}
        </span>
        <span
          className="text-xs font-semibold tabular-nums"
          style={{ color }}
        >
          {pct}%
        </span>
      </div>

      <div
        className="text-2xl font-bold tabular-nums"
        style={{ letterSpacing: "-0.5px", color }}
      >
        {value}
      </div>

      {/* Progress bar */}
      <div
        className="h-1 rounded-full mt-2.5 overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function TotalCard({ value }: { value: number }) {
  return (
    <div
      className="rounded-xl px-4 py-3.5 animate-fade-up delay-1"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="text-[11px] font-medium uppercase tracking-[0.8px] mb-2.5"
        style={{ color: "#4A5568" }}
      >
        Всего
      </div>
      <div
        className="text-2xl font-bold tabular-nums"
        style={{ color: "#F0F4FF", letterSpacing: "-0.5px" }}
      >
        {value}
      </div>
      <div
        className="h-1 rounded-full mt-2.5 overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full w-full rounded-full"
          style={{ background: "rgba(255,255,255,0.15)" }}
        />
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
        color="#34D399"
        bgColor="rgba(16,185,129,0.12)"
        delay="delay-2"
      />
      <StatCard
        label="На складе"
        value={stats.storage}
        total={stats.total}
        color="#60A5FA"
        bgColor="rgba(59,130,246,0.12)"
        delay="delay-3"
      />
      <StatCard
        label="В ремонте"
        value={stats.repair}
        total={stats.total}
        color="#FCD34D"
        bgColor="rgba(245,158,11,0.12)"
        delay="delay-4"
      />
      <StatCard
        label="Сломано"
        value={stats.broken}
        total={stats.total}
        color="#F87171"
        bgColor="rgba(239,68,68,0.12)"
        delay="delay-5"
      />
    </div>
  );
}