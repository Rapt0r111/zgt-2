/**
 * PersonnelStats — Server Component showing aggregated counts
 */

import { getPersonnelStats } from "@/lib/personnel.server";
import { cn } from "@/lib/utils";

interface StatItemProps {
  label: string;
  value: number;
  color: string;
  ring:  string;
}

function StatItem({ label, value, color, ring }: StatItemProps) {
  return (
    <div className={cn(
      "flex flex-col gap-0.5 px-4 py-3 rounded-lg border",
      ring
    )}>
      <span className={cn("text-2xl font-bold tabular-nums", color)}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export async function PersonnelStats() {
  const stats = await getPersonnelStats();

  const items = [
    { label: "Всего",         value: stats.total,     color: "text-foreground",        ring: "border-border" },
    { label: "В строю",       value: stats.active,    color: "text-emerald-500",       ring: "border-emerald-500/20 bg-emerald-500/5" },
    { label: "Командировка",  value: stats.detached,  color: "text-blue-500",          ring: "border-blue-500/20 bg-blue-500/5" },
    { label: "Госпиталь",     value: stats.hospital,  color: "text-amber-500",         ring: "border-amber-500/20 bg-amber-500/5" },
    { label: "Отпуск",        value: stats.leave,     color: "text-violet-500",        ring: "border-violet-500/20 bg-violet-500/5" },
    { label: "Уволены",       value: stats.dismissed, color: "text-muted-foreground",  ring: "border-border" },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {items.map((item) => (
        <StatItem key={item.label} {...item} />
      ))}
    </div>
  );
}