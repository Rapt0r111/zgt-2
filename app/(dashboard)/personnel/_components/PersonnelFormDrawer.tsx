"use client";

/**
 * PersonnelFormDrawer — manages drawer open/close state,
 * listens for personnel:edit and personnel:create custom events.
 */

import { useState, useEffect, useCallback } from "react";
import { UserPlus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetBody,
} from "@/components/ui/sheet";
import { PersonnelForm } from "./PersonnelForm";
import { cn } from "@/lib/utils";
import type { PersonnelRow } from "@/lib/personnel.server";

type DrawerMode = "create" | "edit";

export function PersonnelFormDrawer({ canCreate }: { canCreate: boolean }) {
  const [isOpen,     setIsOpen]     = useState(false);
  const [mode,       setMode]       = useState<DrawerMode>("create");
  const [editData,   setEditData]   = useState<PersonnelRow | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  // Listen for "personnel:edit" events dispatched by table rows / detail page
  useEffect(() => {
    const editHandler = async (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (!detail?.id) return;

      setIsFetching(true);
      setMode("edit");
      setEditData(null);
      setIsOpen(true);

      try {
        const res = await fetch(`/api/personnel/${detail.id}`);
        if (res.ok) {
          const data = (await res.json()) as PersonnelRow;
          setEditData(data);
        }
      } catch {
        // handled by form empty state
      } finally {
        setIsFetching(false);
      }
    };

    // Listen for "personnel:create" dispatched by CommandPalette
    const createHandler = () => {
      setMode("create");
      setEditData(null);
      setIsOpen(true);
    };

    window.addEventListener("personnel:edit",   editHandler);
    window.addEventListener("personnel:create", createHandler);
    return () => {
      window.removeEventListener("personnel:edit",   editHandler);
      window.removeEventListener("personnel:create", createHandler);
    };
  }, []);

  const openCreate = useCallback(() => {
    setMode("create");
    setEditData(null);
    setIsOpen(true);
  }, []);

  const handleClose   = useCallback(() => setIsOpen(false), []);
  const handleSuccess = useCallback((_id: string) => setIsOpen(false), []);

  return (
    <>
      {canCreate && (
        <button
          onClick={openCreate}
          className={cn(
            "h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium",
            "hover:bg-primary/90 transition-colors",
            "flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          )}
        >
          <UserPlus className="w-4 h-4" />
          Добавить
        </button>
      )}

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent>
          <SheetHeader>
            <div>
              <SheetTitle>
                {mode === "create" ? "Новый сотрудник" : "Редактировать запись"}
              </SheetTitle>
              <SheetDescription>
                {mode === "create"
                  ? "Заполните данные о сотруднике"
                  : "Внесите изменения и нажмите «Сохранить»"}
              </SheetDescription>
            </div>
            <SheetClose />
          </SheetHeader>

          <SheetBody>
            {isFetching ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <PersonnelForm
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