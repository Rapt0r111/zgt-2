"use client";

import { useState, useEffect, useCallback } from "react";
import { MonitorPause } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose, SheetBody,
} from "@/components/ui/sheet";
import { EquipmentForm } from "./EquipmentForm";
import { cn } from "@/lib/utils";
import type { EquipmentRow } from "@/lib/equipment.server";

export function EquipmentFormDrawer({ canCreate }: { canCreate: boolean }) {
  const [isOpen,     setIsOpen]     = useState(false);
  const [mode,       setMode]       = useState<"create" | "edit">("create");
  const [editData,   setEditData]   = useState<EquipmentRow | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    const editHandler = async (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (!detail?.id) return;
      setIsFetching(true);
      setMode("edit");
      setEditData(null);
      setIsOpen(true);
      try {
        const res = await fetch(`/api/equipment/${detail.id}`);
        if (res.ok) setEditData(await res.json());
      } catch {
        /* handled by empty form state */
      } finally {
        setIsFetching(false);
      }
    };
    const createHandler = () => { setMode("create"); setEditData(null); setIsOpen(true); };
    window.addEventListener("equipment:edit",   editHandler);
    window.addEventListener("equipment:create", createHandler);
    return () => {
      window.removeEventListener("equipment:edit",   editHandler);
      window.removeEventListener("equipment:create", createHandler);
    };
  }, []);

  const openCreate    = useCallback(() => { setMode("create"); setEditData(null); setIsOpen(true); }, []);
  const handleClose   = useCallback(() => setIsOpen(false), []);
  const handleSuccess = useCallback(() => setIsOpen(false), []);

  return (
    <>
      {canCreate && (
        <button
          onClick={openCreate}
          className="h-9 px-4 rounded-xl text-sm font-600 flex items-center gap-2 btn-aurora focus:outline-none"
          style={{ fontWeight: 600 }}
        >
          <MonitorPause className="w-4 h-4" />
          Добавить
        </button>
      )}

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent>
          <SheetHeader>
            <div>
              <SheetTitle>
                {mode === "create" ? "Новое устройство" : "Редактировать устройство"}
              </SheetTitle>
              <SheetDescription>
                {mode === "create" ? "Заполните данные об устройстве" : "Внесите изменения и нажмите «Сохранить»"}
              </SheetDescription>
            </div>
            <SheetClose />
          </SheetHeader>

          <SheetBody>
            {isFetching ? (
              <div className="flex items-center justify-center py-12">
                <div
                  className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "hsl(217 91% 60%)", borderTopColor: "transparent" }}
                />
              </div>
            ) : (
              <EquipmentForm
                mode={mode}
                defaultData={mode === "edit" ? editData : null}
                onSuccess={handleSuccess}
                onCancel={handleClose}
              />
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}