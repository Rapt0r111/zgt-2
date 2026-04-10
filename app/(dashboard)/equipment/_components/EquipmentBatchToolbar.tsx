"use client";

/**
 * EquipmentBatchToolbar — Aurora floating action bar
 */

import { useState, useEffect, useTransition } from "react";
import { Users, ArchiveRestore, MapPin, X, Loader2, CheckCheck } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  batchIssueEquipmentItems,
  batchReturnEquipmentItems,
  batchMoveEquipment,
} from "@/lib/actions/equipment";
import { BatchIssueSchema, BatchMoveSchema } from "@/types/equipment";
import type { BatchIssueValues, BatchMoveValues } from "@/types/equipment";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { getSelected, setSelected } from "./EquipmentTableClient";

type BatchMode = "issue" | "return" | "move";

const inputStyle: React.CSSProperties = {
  background: "hsl(220 38% 10%)",
  border: "1px solid hsl(220 30% 16%)",
  borderRadius: "10px",
  color: "hsl(220 50% 92%)",
  fontSize: "13px",
  height: "36px",
  padding: "0 0.75rem",
  width: "100%",
  outline: "none",
};

/* ── Forms ──────────────────────────────────────────────────────────────── */

function IssueForm({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit } = useForm<BatchIssueValues>({
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
        <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Местоположение</label>
        <input {...register("toLocation")} placeholder="Каб. 101" style={inputStyle} />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Документ-основание</label>
        <input {...register("documentRef")} placeholder="Накладная №..." style={inputStyle} />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Примечания</label>
        <textarea
          {...register("notes")} rows={2} placeholder="..."
          style={{ ...inputStyle, height: "auto", padding: "0.5rem 0.75rem", resize: "none" }}
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDone}
          className="h-9 px-4 rounded-xl text-sm transition-all"
          style={{ ...inputStyle, width: "auto", color: "hsl(215 16% 55%)" }}
        >
          Отмена
        </button>
        <button type="submit" disabled={isPending}
          className="h-9 px-5 rounded-xl text-sm font-600 btn-aurora flex items-center gap-2 disabled:opacity-50"
          style={{ fontWeight: 600 }}
        >
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
        <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Новое местоположение *</label>
        <input
          {...register("toLocation")} placeholder="Каб. 202" autoFocus
          style={{ ...inputStyle, borderColor: errors.toLocation ? "hsl(0 72% 60% / 0.5)" : "hsl(220 30% 16%)" }}
        />
        {errors.toLocation && <p className="text-xs mt-1" style={{ color: "hsl(0 72% 72%)" }}>{errors.toLocation.message}</p>}
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Примечания</label>
        <textarea
          {...register("notes")} rows={2}
          style={{ ...inputStyle, height: "auto", padding: "0.5rem 0.75rem", resize: "none" }}
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDone}
          className="h-9 px-4 rounded-xl text-sm"
          style={{ ...inputStyle, width: "auto", color: "hsl(215 16% 55%)" }}
        >
          Отмена
        </button>
        <button type="submit" disabled={isPending}
          className="h-9 px-5 rounded-xl text-sm font-600 btn-aurora flex items-center gap-2 disabled:opacity-50"
          style={{ fontWeight: 600 }}
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Переместить
        </button>
      </div>
    </form>
  );
}

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
        Вернуть <span className="font-600" style={{ color: "hsl(220 50% 92%)", fontWeight: 600 }}>{ids.length}</span> устройств на склад?
      </p>
      <div>
        <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Документ-основание</label>
        <input
          value={docRef}
          onChange={(e) => setDocRef(e.target.value)}
          placeholder="Накладная №..."
          style={inputStyle}
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDone}
          className="h-9 px-4 rounded-xl text-sm"
          style={{ ...inputStyle, width: "auto", color: "hsl(215 16% 55%)" }}
        >
          Отмена
        </button>
        <button
          type="button" disabled={isPending} onClick={handleReturn}
          className="h-9 px-5 rounded-xl text-sm font-600 flex items-center gap-2 disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, hsl(213 100% 52%), hsl(217 91% 60%))",
            color: "#fff", fontWeight: 600,
            boxShadow: "0 4px 16px hsl(217 91% 60% / 0.3)",
          }}
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <CheckCheck className="w-4 h-4" />
          Принять на склад
        </button>
      </div>
    </div>
  );
}

/* ── Main toolbar ────────────────────────────────────────────────────────── */

export function EquipmentBatchToolbar() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialogMode, setDialogMode]   = useState<BatchMode | null>(null);

  useEffect(() => {
    const sync = () => setSelectedIds([...getSelected()]);
    window.addEventListener("equipment:selection", sync);
    return () => window.removeEventListener("equipment:selection", sync);
  }, []);

  const clearSelection = () => { setSelected(new Set()); setSelectedIds([]); };
  const closeDone      = () => { setDialogMode(null); clearSelection(); };

  if (selectedIds.length === 0) return null;

  const toolbarBtnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "6px",
    padding: "6px 12px", borderRadius: "8px",
    background: "rgba(255,255,255,0.08)",
    color: "hsl(220 50% 92%)", fontSize: "13px",
    transition: "background 0.15s", cursor: "pointer", border: "none",
  };

  return (
    <>
      {/* Floating toolbar */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl animate-fade-up"
        style={{
          background: "hsl(220 40% 10% / 0.95)",
          border: "1px solid hsl(220 30% 16%)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 16px 48px hsl(220 47% 2% / 0.6)",
        }}
      >
        <span className="text-sm font-600 mr-2" style={{ fontWeight: 600, color: "hsl(220 50% 92%)" }}>
          Выбрано: {selectedIds.length}
        </span>

        <div className="w-px h-5" style={{ background: "hsl(220 30% 20%)" }} />

        <button style={toolbarBtnStyle} onClick={() => setDialogMode("issue")}>
          <Users className="w-3.5 h-3.5" />
          Выдать
        </button>
        <button style={toolbarBtnStyle} onClick={() => setDialogMode("return")}>
          <ArchiveRestore className="w-3.5 h-3.5" />
          Принять
        </button>
        <button style={toolbarBtnStyle} onClick={() => setDialogMode("move")}>
          <MapPin className="w-3.5 h-3.5" />
          Переместить
        </button>

        <div className="w-px h-5" style={{ background: "hsl(220 30% 20%)" }} />

        <button
          onClick={clearSelection}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "hsl(215 16% 46%)", cursor: "pointer" }}
          aria-label="Снять выделение"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Dialog */}
      <Dialog.Root open={!!dialogMode} onOpenChange={(open) => !open && setDialogMode(null)}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 z-50 animate-in fade-in-0"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md p-6 rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95"
            style={{
              background: "hsl(220 40% 9% / 0.98)",
              border: "1px solid hsl(220 30% 16%)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <Dialog.Title className="text-base font-600" style={{ fontWeight: 600 }}>
                  {dialogMode === "issue"  && "Массовая выдача"}
                  {dialogMode === "return" && "Массовый возврат"}
                  {dialogMode === "move"   && "Массовое перемещение"}
                </Dialog.Title>
                <Dialog.Description className="text-xs text-muted-foreground mt-0.5">
                  {selectedIds.length} устройств
                </Dialog.Description>
              </div>
              <Dialog.Close
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "hsl(215 16% 40%)" }}
              >
                <X className="w-4 h-4" />
              </Dialog.Close>
            </div>

            {dialogMode === "issue"  && <IssueForm ids={selectedIds} onDone={closeDone} />}
            {dialogMode === "return" && <ReturnConfirm ids={selectedIds} onDone={closeDone} />}
            {dialogMode === "move"   && <MoveForm ids={selectedIds} onDone={closeDone} />}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}