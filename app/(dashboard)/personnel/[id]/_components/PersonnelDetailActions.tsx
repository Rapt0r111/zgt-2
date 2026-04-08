"use client";

/**
 * PersonnelDetailActions — edit/delete buttons on the detail page.
 * Dispatches the same `personnel:edit` event that the drawer listens to,
 * so clicking Edit opens the drawer with the record pre-filled.
 * The drawer must be mounted in a parent (layout or the form drawer island).
 */

import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonnelDetailActionsProps {
  personId: string;
}

export function PersonnelDetailActions({ personId }: PersonnelDetailActionsProps) {
  const handleEdit = () => {
    window.dispatchEvent(
      new CustomEvent("personnel:edit", { detail: { id: personId } })
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