"use client";

/**
 * EquipmentDetailActions — edit button on the detail page.
 * Dispatches equipment:edit event caught by EquipmentFormDrawer.
 */

import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface EquipmentDetailActionsProps {
  equipmentId: string;
}

export function EquipmentDetailActions({ equipmentId }: EquipmentDetailActionsProps) {
  const handleEdit = () => {
    window.dispatchEvent(
      new CustomEvent("equipment:edit", { detail: { id: equipmentId } })
    );
  };

  return (
    <button
      onClick={handleEdit}
      className={cn(
        "h-9 px-3 rounded-lg border border-input text-sm",
        "flex items-center gap-2 shrink-0",
        "text-muted-foreground hover:text-foreground hover:bg-muted",
        "transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
      )}
    >
      <Pencil className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Редактировать</span>
    </button>
  );
}