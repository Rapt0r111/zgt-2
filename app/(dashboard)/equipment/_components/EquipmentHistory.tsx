/**
 * EquipmentHistory — Transfer history timeline (Server Component)
 */

import { getEquipmentTransferHistory } from "@/lib/equipment.server";
import { TRANSFER_TYPE_LABELS } from "@/types/equipment";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ArrowRightLeft, UserPlus, UserMinus, Wrench, CheckCircle2, FileText, Clock,
} from "lucide-react";

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  issued:          UserPlus,
  returned:        UserMinus,
  sent_repair:     Wrench,
  returned_repair: CheckCircle2,
  written_off:     FileText,
};

const TYPE_COLORS: Record<string, string> = {
  issued:          "bg-emerald-500/10 text-emerald-600",
  returned:        "bg-blue-500/10 text-blue-600",
  sent_repair:     "bg-amber-500/10 text-amber-600",
  returned_repair: "bg-violet-500/10 text-violet-600",
  written_off:     "bg-red-500/10 text-red-600",
};

interface EquipmentHistoryProps {
  equipmentId: string;
}

export async function EquipmentHistory({ equipmentId }: EquipmentHistoryProps) {
  const transfers = await getEquipmentTransferHistory(equipmentId);

  if (transfers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
          <Clock className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">История пуста</p>
        <p className="text-xs text-muted-foreground mt-1">Операции с устройством ещё не производились</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-border" aria-hidden />

      <div className="space-y-0">
        {transfers.map((transfer, idx) => {
          const Icon = TYPE_ICONS[transfer.type] ?? ArrowRightLeft;
          const colorClass = TYPE_COLORS[transfer.type] ?? "bg-muted text-muted-foreground";
          const typeLabel  = TRANSFER_TYPE_LABELS[transfer.type] ?? transfer.type;

          return (
            <div key={transfer.id} className={cn("relative flex gap-4 pb-6", idx === transfers.length - 1 && "pb-0")}>
              {/* Icon */}
              <div className={cn("relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center", colorClass)}>
                <Icon className="w-4 h-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{typeLabel}</p>
                    {/* From → To */}
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {(transfer.fromPersonnelName || transfer.fromLocation) && (
                        <p>
                          <span className="text-muted-foreground/60">Откуда:</span>{" "}
                          {[transfer.fromPersonnelName, transfer.fromLocation].filter(Boolean).join(" / ")}
                        </p>
                      )}
                      {(transfer.toPersonnelName || (transfer as any).toLocation) && (
                        <p>
                          <span className="text-muted-foreground/60">Куда:</span>{" "}
                          {[transfer.toPersonnelName, (transfer as any).toLocation].filter(Boolean).join(" / ")}
                        </p>
                      )}
                    </div>
                    {transfer.documentRef && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="text-muted-foreground/60">Документ:</span>{" "}
                        <span className="font-mono">{transfer.documentRef}</span>
                      </p>
                    )}
                    {transfer.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{transfer.notes}</p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatDateTime(transfer.transferredAt as unknown as Date)}
                    </p>
                    {transfer.performedByName && (
                      <p className="text-xs text-muted-foreground/60 mt-0.5">{transfer.performedByName}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}