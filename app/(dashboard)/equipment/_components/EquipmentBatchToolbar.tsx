"use client";

/**
 * EquipmentBatchToolbar — floating action bar when items are selected.
 * Provides: выдача, сдача, перемещение
 */

import { useState, useEffect, useTransition } from "react";
import { Users, ArchiveRestore, MapPin, X, Loader2, CheckCheck } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { batchIssueEquipmentItems, batchReturnEquipmentItems, batchMoveEquipment } from "@/lib/actions/equipment";
import { BatchIssueSchema, BatchMoveSchema } from "@/types/equipment";
import type { BatchIssueValues, BatchMoveValues } from "@/types/equipment";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { getSelected, setSelected } from "./EquipmentTableClient";

type BatchMode = "issue" | "return" | "move";

// ── Dialog helper ──────────────────────────────────────────────────────────

const inputClass = cn(
  "w-full h-9 px-3 rounded-lg border border-input bg-background text-sm",
  "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
);

function IssueForm({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<BatchIssueValues>({
    resolver: zodResolver(BatchIssueSchema),
    defaultValues: { ids },
  });

  const onSubmit = (data: BatchIssueValues) => {
    startTransition(async () => {
      const result = await batchIssueEquipmentItems({ ...data, ids });
      if (result.success) {
        toast({ variant: "success", title: `Выдано ${result.affected} устройств` });
        onDone();
      } else {
        toast({ variant: "error", title: "Ошибка", description: result.errors?.join(", ") });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5">Местоположение</label>
        <input {...register("toLocation")} placeholder="Каб. 101" className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Документ-основание</label>
        <input {...register("documentRef")} placeholder="Накладная №..." className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Примечания</label>
        <textarea {...register("notes")} rows={2} placeholder="..." className={cn(inputClass, "h-auto py-2 resize-none")} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onDone} className="h-9 px-4 rounded-lg border border-input text-sm hover:bg-muted">Отмена</button>
        <button type="submit" disabled={isPending} className={cn("h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50")}>
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Выдать {ids.length} устройств
        </button>
      </div>
    </form>
  );
}

function MoveForm({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<BatchMoveValues>({
    resolver: zodResolver(BatchMoveSchema),
    defaultValues: { ids },
  });

  const onSubmit = (data: BatchMoveValues) => {
    startTransition(async () => {
      const result = await batchMoveEquipment({ ...data, ids });
      if (result.success) {
        toast({ variant: "success", title: `Перемещено ${result.affected} устройств` });
        onDone();
      } else {
        toast({ variant: "error", title: "Ошибка", description: result.errors?.join(", ") });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5">Новое местоположение *</label>
        <input {...register("toLocation")} placeholder="Каб. 202" className={cn(inputClass, errors.toLocation && "border-destructive")} autoFocus />
        {errors.toLocation && <p className="text-xs text-destructive mt-1">{errors.toLocation.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Примечания</label>
        <textarea {...register("notes")} rows={2} className={cn(inputClass, "h-auto py-2 resize-none")} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onDone} className="h-9 px-4 rounded-lg border border-input text-sm hover:bg-muted">Отмена</button>
        <button type="submit" disabled={isPending} className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50">
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Переместить
        </button>
      </div>
    </form>
  );
}

// ── Return confirmation ───────────────────────────────────────────────────

function ReturnConfirm({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [docRef, setDocRef] = useState("");

  const handleReturn = () => {
    startTransition(async () => {
      const result = await batchReturnEquipmentItems(ids, { documentRef: docRef });
      if (result.success) {
        toast({ variant: "success", title: `Принято ${result.affected} устройств` });
        onDone();
      } else {
        toast({ variant: "error", title: "Ошибка", description: result.errors?.join(", ") });
      }
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Вернуть <span className="font-semibold text-foreground">{ids.length}</span> устройств на склад?
      </p>
      <div>
        <label className="block text-sm font-medium mb-1.5">Документ-основание</label>
        <input value={docRef} onChange={(e) => setDocRef(e.target.value)} placeholder="Накладная №..." className={inputClass} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onDone} className="h-9 px-4 rounded-lg border border-input text-sm hover:bg-muted">Отмена</button>
        <button type="button" disabled={isPending} onClick={handleReturn}
          className="h-9 px-5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 flex items-center gap-2 disabled:opacity-50">
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <CheckCheck className="w-4 h-4" />
          Принять на склад
        </button>
      </div>
    </div>
  );
}

// ── Main toolbar ──────────────────────────────────────────────────────────

export function EquipmentBatchToolbar() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialogMode, setDialogMode] = useState<BatchMode | null>(null);

  useEffect(() => {
    const sync = () => {
      setSelectedIds([...getSelected()]);
    };
    window.addEventListener("equipment:selection", sync);
    return () => window.removeEventListener("equipment:selection", sync);
  }, []);

  const clearSelection = () => {
    setSelected(new Set());
    setSelectedIds([]);
  };

  const closeDone = () => {
    setDialogMode(null);
    clearSelection();
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      {/* Floating toolbar */}
      <div className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-40",
        "flex items-center gap-2 px-4 py-3 rounded-2xl",
        "bg-foreground text-background shadow-2xl",
        "border border-border/10",
        "animate-in slide-in-from-bottom-4 fade-in-0 duration-200"
      )}>
        <span className="text-sm font-semibold mr-2">
          Выбрано: {selectedIds.length}
        </span>

        <div className="w-px h-5 bg-background/20" />

        <button
          onClick={() => setDialogMode("issue")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/10 hover:bg-background/20 text-sm transition-colors"
        >
          <Users className="w-3.5 h-3.5" />
          Выдать
        </button>

        <button
          onClick={() => setDialogMode("return")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/10 hover:bg-background/20 text-sm transition-colors"
        >
          <ArchiveRestore className="w-3.5 h-3.5" />
          Принять
        </button>

        <button
          onClick={() => setDialogMode("move")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/10 hover:bg-background/20 text-sm transition-colors"
        >
          <MapPin className="w-3.5 h-3.5" />
          Переместить
        </button>

        <div className="w-px h-5 bg-background/20" />

        <button onClick={clearSelection} className="p-1.5 rounded-lg hover:bg-background/20 transition-colors" aria-label="Снять выделение">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Batch dialog */}
      <Dialog.Root open={!!dialogMode} onOpenChange={(open) => !open && setDialogMode(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in-0" />
          <Dialog.Content className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6",
            "animate-in fade-in-0 zoom-in-95"
          )}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <Dialog.Title className="text-base font-semibold">
                  {dialogMode === "issue"  && "Массовая выдача"}
                  {dialogMode === "return" && "Массовый возврат"}
                  {dialogMode === "move"   && "Массовое перемещение"}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground mt-0.5">
                  {selectedIds.length} устройств
                </Dialog.Description>
              </div>
              <Dialog.Close className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
                <X className="w-4 h-4" />
              </Dialog.Close>
            </div>

            {dialogMode === "issue"  && <IssueForm  ids={selectedIds} onDone={closeDone} />}
            {dialogMode === "return" && <ReturnConfirm ids={selectedIds} onDone={closeDone} />}
            {dialogMode === "move"   && <MoveForm   ids={selectedIds} onDone={closeDone} />}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}