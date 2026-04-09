"use client";

/**
 * EquipmentTableClient — thin client bridge
 * Manages row checkbox selection via Zustand-like context (simple atom via CustomEvent)
 * and dispatches edit events.
 */

import { useState, useEffect, useTransition } from "react";
import { MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { deleteEquipment } from "@/lib/actions/equipment";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

interface Props {
  id:          string;
  displayName: string;
  canEdit:     boolean;
  canDelete:   boolean;
  mode:        "checkbox" | "actions";
}

// ── Global selection state via events ─────────────────────────────────────

const SELECTED_IDS_KEY = "__eq_selected";

function getSelected(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SELECTED_IDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function setSelected(ids: Set<string>) {
  sessionStorage.setItem(SELECTED_IDS_KEY, JSON.stringify([...ids]));
  window.dispatchEvent(new Event("equipment:selection"));
}

export function EquipmentTableClient({ id, displayName, canEdit, canDelete, mode }: Props) {
  const [checked, setChecked] = useState(false);

  // Sync checkbox state from session storage
  useEffect(() => {
    const sync = () => setChecked(getSelected().has(id));
    sync();
    window.addEventListener("equipment:selection", sync);
    return () => window.removeEventListener("equipment:selection", sync);
  }, [id]);

  if (mode === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          const next = getSelected();
          e.target.checked ? next.add(id) : next.delete(id);
          setSelected(next);
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-4 h-4 rounded border-input accent-primary cursor-pointer"
        aria-label={`Выбрать ${displayName}`}
      />
    );
  }

  return (
    <EquipmentRowActions
      id={id}
      displayName={displayName}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}

// ── Row actions dropdown ───────────────────────────────────────────────────

function EquipmentRowActions({
  id, displayName, canEdit, canDelete,
}: Pick<Props, "id" | "displayName" | "canEdit" | "canDelete">) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleEdit = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("equipment:edit", { detail: { id } }));
  };

  const handleDelete = () => {
    setOpen(false);
    if (!confirm(`Удалить "${displayName}"? Это действие нельзя отменить.`)) return;
    startTransition(async () => {
      const result = await deleteEquipment(id);
      if (result.success) {
        toast({ variant: "success", title: "Удалено", description: displayName });
      } else {
        toast({ variant: "error", title: "Ошибка", description: result.error });
      }
    });
  };

  if (!canEdit && !canDelete) return null;

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "h-7 w-7 flex items-center justify-center rounded-md",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            "opacity-0 group-hover:opacity-100 focus:opacity-100",
            "transition-all focus:outline-none focus:ring-2 focus:ring-ring"
          )}
          aria-label="Действия"
          onClick={(e) => e.stopPropagation()}
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MoreHorizontal className="w-3.5 h-3.5" />}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end" sideOffset={4}
          className={cn(
            "z-50 min-w-[150px] overflow-hidden rounded-lg border border-border",
            "bg-popover shadow-xl p-1",
            "animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {canEdit && (
            <DropdownMenu.Item
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm cursor-pointer text-foreground hover:bg-muted outline-none"
              onSelect={handleEdit}
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              Редактировать
            </DropdownMenu.Item>
          )}
          {canEdit && canDelete && <DropdownMenu.Separator className="my-1 h-px bg-border" />}
          {canDelete && (
            <DropdownMenu.Item
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm cursor-pointer text-destructive hover:bg-destructive/10 outline-none"
              onSelect={handleDelete}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Удалить
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ── Export selection helpers for batch toolbar ─────────────────────────────

export { getSelected, setSelected };