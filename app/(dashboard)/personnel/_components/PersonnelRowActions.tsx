"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { deletePersonnel } from "@/lib/actions/personnel";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toaster";

interface PersonnelRowActionsProps {
  id:        string;
  fullName:  string;
  canEdit:   boolean;
  canDelete: boolean;
  onEdit:    (id: string) => void;
}

export function PersonnelRowActions({
  id,
  fullName,
  canEdit,
  canDelete,
  onEdit,
}: PersonnelRowActionsProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!confirm(`Удалить "${fullName}"? Это действие нельзя отменить.`)) return;

    startTransition(async () => {
      const result = await deletePersonnel(id);
      if (result.success) {
        toast({ variant: "success", title: "Запись удалена", description: fullName });
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
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <MoreHorizontal className="w-3.5 h-3.5" />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className={cn(
            "z-50 min-w-[150px] overflow-hidden rounded-lg border border-border",
            "bg-popover shadow-xl p-1",
            "animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {canEdit && (
            <DropdownMenu.Item
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm cursor-pointer",
                "text-foreground hover:bg-muted outline-none",
                "transition-colors"
              )}
              onSelect={() => {
                setOpen(false);
                onEdit(id);
              }}
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              Редактировать
            </DropdownMenu.Item>
          )}

          {canDelete && canEdit && (
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
          )}

          {canDelete && (
            <DropdownMenu.Item
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm cursor-pointer",
                "text-destructive hover:bg-destructive/10 outline-none",
                "transition-colors"
              )}
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