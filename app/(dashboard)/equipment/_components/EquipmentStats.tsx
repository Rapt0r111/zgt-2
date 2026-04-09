/**
 * EquipmentStats — Server Component, aggregated counts
 */

import { getEquipmentStats } from "@/lib/equipment.server";
import { cn } from "@/lib/utils";

function StatItem({
  label, value, color, ring,
}: {
  label: string; value: number; color: string; ring: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5 px-4 py-3 rounded-lg border", ring)}>
      <span className={cn("text-2xl font-bold tabular-nums", color)}>{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export async function EquipmentStats() {
  const stats = await getEquipmentStats();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      <StatItem label="Всего"      value={stats.total}   color="text-foreground"      ring="border-border" />
      <StatItem label="В работе"   value={stats.inUse}   color="text-emerald-500"     ring="border-emerald-500/20 bg-emerald-500/5" />
      <StatItem label="На складе"  value={stats.storage} color="text-blue-500"        ring="border-blue-500/20 bg-blue-500/5" />
      <StatItem label="В ремонте"  value={stats.repair}  color="text-amber-500"       ring="border-amber-500/20 bg-amber-500/5" />
      <StatItem label="Сломано"    value={stats.broken}  color="text-red-500"         ring="border-red-500/20 bg-red-500/5" />
    </div>
  );
}