"use client";

/**
 * EquipmentForm — full create/edit form
 * Sections: identity → specs → state → kit → storage devices
 */

import { useEffect, useTransition } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2, HardDrive } from "lucide-react";
import { EquipmentFormSchema, DEVICE_TYPES, EQUIPMENT_STATUSES, STORAGE_TYPES } from "@/types/equipment";
import type { EquipmentFormValues } from "@/types/equipment";
import { createEquipment, updateEquipment } from "@/lib/actions/equipment";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { EquipmentRow } from "@/lib/equipment.server";

// ── Field wrapper ──────────────────────────────────────────────────────────

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-5 pb-1">
      <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">{children}</h3>
    </div>
  );
}

const inputClass = cn(
  "w-full h-9 px-3 rounded-lg border border-input bg-background text-sm",
  "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow disabled:opacity-50"
);
const selectClass = cn(inputClass, "appearance-none cursor-pointer");

// ── Helpers ────────────────────────────────────────────────────────────────

function equipmentToFormValues(row: EquipmentRow): Partial<EquipmentFormValues> {
  // Map category back to deviceType
  const categoryMap: Record<string, string> = {
    laptop: "laptop", server: "server", other: "other",
  };
  const deviceType = categoryMap[row.category] ?? "pэвм";

  return {
    deviceType:      deviceType as any,
    displayName:     row.displayName,
    inventoryNumber: row.inventoryNumber ?? "",
    serialNumber:    row.serialNumber    ?? "",
    mniSerialNumber: row.mniSerialNumber ?? "",
    manufacturer:    row.manufacturer    ?? "",
    model:           row.model           ?? "",
    cpu:             row.cpu             ?? "",
    ramGb:           row.ramGb           ?? undefined,
    storageType:     (row.storageType as any) ?? undefined,
    storageGb:       row.storageGb       ?? undefined,
    os:              row.os              ?? "",
    status:          row.status as any,
    isWorking:       row.status !== "broken",
    location:        row.location        ?? "",
    personnelId:     row.personnelId     ?? "",
    hasCharger:      row.hasCharger      ?? false,
    isChargerWorking: row.isChargerWorking ?? false,
    hasMouse:        row.hasMouse        ?? false,
    isMouseWorking:  row.isMouseWorking  ?? false,
    hasBag:          row.hasBag          ?? false,
    storageDevices:  [],
  };
}

// ── Main Form ──────────────────────────────────────────────────────────────

interface EquipmentFormProps {
  mode:        "create" | "edit";
  defaultData?: EquipmentRow | null;
  onSuccess:   (id: string) => void;
  onCancel:    () => void;
}

export function EquipmentForm({ mode, defaultData, onSuccess, onCancel }: EquipmentFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const defaultValues: EquipmentFormValues = {
    deviceType:      "pэвм",
    displayName:     "",
    inventoryNumber: "",
    serialNumber:    "",
    mniSerialNumber: "",
    manufacturer:    "",
    model:           "",
    cpu:             "",
    ramGb:           undefined,
    storageType:     undefined,
    storageGb:       undefined,
    os:              "",
    status:          "storage",
    isWorking:       true,
    location:        "",
    personnelId:     "",
    hasCharger:      false,
    isChargerWorking: false,
    hasMouse:        false,
    isMouseWorking:  false,
    hasBag:          false,
    storageDevices:  [],
    ...( defaultData ? equipmentToFormValues(defaultData) : {} ),
  };

  const {
    register, handleSubmit, control, watch, reset,
    formState: { errors, isDirty },
  } = useForm<EquipmentFormValues>({
    resolver: zodResolver(EquipmentFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "storageDevices" });

  const deviceType = watch("deviceType");
  const isLaptop   = deviceType === "laptop";
  const hasCharger = watch("hasCharger");
  const hasMouse   = watch("hasMouse");

  useEffect(() => {
    reset(defaultValues);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultData?.id]);

  const onSubmit = (data: EquipmentFormValues) => {
    startTransition(async () => {
      const result = mode === "create"
        ? await createEquipment(data)
        : await updateEquipment(defaultData!.id, data);

      if (result.success && result.id) {
        toast({
          variant: "success",
          title:   mode === "create" ? "Устройство добавлено" : "Изменения сохранены",
          description: data.displayName,
        });
        onSuccess(result.id);
      } else {
        toast({ variant: "error", title: "Ошибка", description: result.error });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-1">
      {/* ── Identity ──────────────────────────────────────────────────── */}
      <SectionTitle>Основная информация</SectionTitle>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Тип устройства" required error={errors.deviceType?.message}>
          <Controller name="deviceType" control={control} render={({ field }) => (
            <select {...field} className={cn(selectClass, errors.deviceType && "border-destructive")}>
              {DEVICE_TYPES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          )} />
        </Field>
        <Field label="Наименование" required error={errors.displayName?.message}>
          <input {...register("displayName")} placeholder="КС-ПЭ-001" autoFocus={mode === "create"}
            className={cn(inputClass, errors.displayName && "border-destructive")} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <Field label="Инвентарный номер (МО)" error={errors.inventoryNumber?.message}>
          <input {...register("inventoryNumber")} placeholder="АА0001234" className={cn(inputClass, "font-mono")} />
        </Field>
        <Field label="Серийный номер" error={errors.serialNumber?.message}>
          <input {...register("serialNumber")} placeholder="SN-..." className={cn(inputClass, "font-mono")} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <Field label="Серийный номер МНИ" error={errors.mniSerialNumber?.message}>
          <input {...register("mniSerialNumber")} placeholder="МНИ-..." className={cn(inputClass, "font-mono")} />
        </Field>
        <Field label="Производитель" error={errors.manufacturer?.message}>
          <input {...register("manufacturer")} placeholder="HP, Dell, Lenovo..." className={inputClass} />
        </Field>
      </div>

      <Field label="Модель" error={errors.model?.message}>
        <input {...register("model")} placeholder="EliteBook 840 G9" className={inputClass} />
      </Field>

      {/* ── Specs ─────────────────────────────────────────────────────── */}
      <SectionTitle>Технические характеристики</SectionTitle>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Процессор (CPU)" error={errors.cpu?.message}>
          <input {...register("cpu")} placeholder="Intel Core i5-1235U" className={inputClass} />
        </Field>
        <Field label="ОЗУ (ГБ)" error={errors.ramGb?.message}>
          <input {...register("ramGb", { valueAsNumber: true, setValueAs: (v) => v === "" ? undefined : Number(v) })}
            type="number" min={1} placeholder="16" className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <Field label="Тип хранилища" error={errors.storageType?.message}>
          <Controller name="storageType" control={control} render={({ field }) => (
            <select {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)} className={selectClass}>
              <option value="">Не указан</option>
              {STORAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )} />
        </Field>
        <Field label="Объём хранилища (ГБ)" error={errors.storageGb?.message}>
          <input {...register("storageGb", { valueAsNumber: true, setValueAs: (v) => v === "" ? undefined : Number(v) })}
            type="number" min={1} placeholder="512" className={inputClass} />
        </Field>
      </div>

      <Field label="Операционная система" error={errors.os?.message}>
        <input {...register("os")} placeholder="Windows 10 Pro, Astra Linux..." className={inputClass} />
      </Field>

      {/* ── State ─────────────────────────────────────────────────────── */}
      <SectionTitle>Состояние</SectionTitle>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Статус" required error={errors.status?.message}>
          <Controller name="status" control={control} render={({ field }) => (
            <select {...field} className={selectClass}>
              {EQUIPMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          )} />
        </Field>
        <Field label="Исправность" error={errors.isWorking?.message}>
          <Controller name="isWorking" control={control} render={({ field }) => (
            <div className="flex items-center h-9 gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" checked={field.value === true}  onChange={() => field.onChange(true)}  className="accent-primary" /> Исправно
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" checked={field.value === false} onChange={() => field.onChange(false)} className="accent-destructive" /> Неисправно
              </label>
            </div>
          )} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <Field label="Местоположение" error={errors.location?.message}>
          <input {...register("location")} placeholder="Каб. 101" className={inputClass} />
        </Field>
        <Field label="Владелец (ID сотрудника)" error={errors.personnelId?.message}>
          <input {...register("personnelId")} placeholder="UUID сотрудника" className={cn(inputClass, "font-mono text-xs")} />
        </Field>
      </div>

      {/* ── Kit (for laptops) ─────────────────────────────────────────── */}
      {isLaptop && (
        <>
          <SectionTitle>Комплектность</SectionTitle>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <KitItem label="Зарядное устройство" hasField="hasCharger" workingField="isChargerWorking"
              hasValue={hasCharger ?? false} control={control} />
            <KitItem label="Мышь" hasField="hasMouse" workingField="isMouseWorking"
              hasValue={hasMouse ?? false} control={control} />

            <div className="flex items-center justify-between py-1.5 border-b border-border">
              <span className="text-sm">Сумка/чехол</span>
              <Controller name="hasBag" control={control} render={({ field }) => (
                <input type="checkbox" checked={field.value ?? false} onChange={(e) => field.onChange(e.target.checked)}
                  className="w-4 h-4 rounded border-input accent-primary" />
              )} />
            </div>
          </div>
        </>
      )}

      {/* ── Storage devices ───────────────────────────────────────────── */}
      <SectionTitle>Накопители</SectionTitle>
      <div className="space-y-3">
        {fields.map((field, idx) => (
          <div key={field.id} className="p-3 rounded-lg border border-border bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <HardDrive className="w-4 h-4 text-muted-foreground" />
                Накопитель #{idx + 1}
              </div>
              <button type="button" onClick={() => remove(idx)} className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Тип</label>
                <select {...register(`storageDevices.${idx}.type`)} className={cn(selectClass, "text-xs")}>
                  <option value="">Не указан</option>
                  {STORAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Серийный номер *</label>
                <input {...register(`storageDevices.${idx}.serialNumber`)} placeholder="SN-..." className={cn(inputClass, "font-mono text-xs")} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Инв. номер</label>
                <input {...register(`storageDevices.${idx}.inventoryNumber`)} className={cn(inputClass, "font-mono text-xs")} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Объём (ГБ)</label>
                <input {...register(`storageDevices.${idx}.capacityGb`, { valueAsNumber: true })} type="number" min={1} placeholder="256" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Производитель</label>
                <input {...register(`storageDevices.${idx}.manufacturer`)} placeholder="WD, Seagate..." className={cn(inputClass, "text-xs")} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Интерфейс</label>
                <input {...register(`storageDevices.${idx}.interface`)} placeholder="SATA, NVMe..." className={cn(inputClass, "text-xs")} />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => append({ serialNumber: "", type: undefined, inventoryNumber: "", manufacturer: "", model: "", capacityGb: undefined, interface: "" })}
          className={cn(
            "flex items-center gap-2 w-full h-9 px-3 rounded-lg border-2 border-dashed border-border",
            "text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-muted/30",
            "transition-colors"
          )}
        >
          <Plus className="w-4 h-4" />
          Добавить накопитель
        </button>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-6">
        <button type="button" onClick={onCancel} disabled={isPending}
          className="h-9 px-4 rounded-lg border border-input text-sm hover:bg-muted transition-colors disabled:opacity-50">
          Отмена
        </button>
        <button type="submit" disabled={isPending || (mode === "edit" && !isDirty)}
          className={cn(
            "h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium",
            "hover:bg-primary/90 transition-colors flex items-center gap-2",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}>
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {mode === "create" ? "Добавить" : "Сохранить"}
        </button>
      </div>
    </form>
  );
}

// ── Kit item component ────────────────────────────────────────────────────

function KitItem({
  label, hasField, workingField, hasValue, control,
}: {
  label:        string;
  hasField:     "hasCharger" | "hasMouse";
  workingField: "isChargerWorking" | "isMouseWorking";
  hasValue:     boolean;
  control:      any;
}) {
  return (
    <div className="space-y-1 py-1.5 border-b border-border">
      <div className="flex items-center justify-between">
        <span className="text-sm">{label}</span>
        <Controller name={hasField} control={control} render={({ field }) => (
          <input type="checkbox" checked={field.value ?? false} onChange={(e) => field.onChange(e.target.checked)}
            className="w-4 h-4 rounded border-input accent-primary" />
        )} />
      </div>
      {hasValue && (
        <div className="flex items-center gap-3 pl-4">
          <span className="text-xs text-muted-foreground">Исправность:</span>
          <Controller name={workingField} control={control} render={({ field }) => (
            <>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="radio" checked={field.value === true}  onChange={() => field.onChange(true)}  className="accent-primary" /> Исправно
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="radio" checked={field.value === false} onChange={() => field.onChange(false)} className="accent-destructive" /> Нет
              </label>
            </>
          )} />
        </div>
      )}
    </div>
  );
}