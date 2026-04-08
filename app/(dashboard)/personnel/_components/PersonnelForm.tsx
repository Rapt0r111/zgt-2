"use client";

/**
 * PersonnelForm — react-hook-form + zod validation
 * Handles both create and edit modes.
 */

import { useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import {
  PersonnelFormSchema,
  MILITARY_RANKS,
  PERSONNEL_STATUSES,
  RANK_LABEL_TO_PRIORITY,
} from "@/types/personnel";
import type { PersonnelFormValues } from "@/types/personnel";
import { createPersonnel, updatePersonnel } from "@/lib/actions/personnel";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { PersonnelRow } from "@/lib/personnel.server";

// ── Form field components ──────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const inputClass = cn(
  "w-full h-9 px-3 rounded-lg border border-input bg-background",
  "text-sm placeholder:text-muted-foreground",
  "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
  "transition-shadow disabled:opacity-50"
);

const selectClass = cn(
  "w-full h-9 px-3 rounded-lg border border-input bg-background",
  "text-sm appearance-none cursor-pointer",
  "focus:outline-none focus:ring-2 focus:ring-ring",
  "disabled:opacity-50"
);

// ── Main form ──────────────────────────────────────────────────────────────────

interface PersonnelFormProps {
  mode:        "create" | "edit";
  defaultData?: PersonnelRow | null;
  onSuccess:   (id: string) => void;
  onCancel:    () => void;
}

export function PersonnelForm({
  mode,
  defaultData,
  onSuccess,
  onCancel,
}: PersonnelFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const defaultValues: PersonnelFormValues = {
    lastName:        defaultData?.lastName        ?? "",
    firstName:       defaultData?.firstName       ?? "",
    middleName:      defaultData?.middleName      ?? "",
    personnelNumber: defaultData?.personnelNumber ?? "",
    rank:            defaultData?.rank            ?? "",
    rankPriority:    defaultData?.rankPriority    ?? 1,
    position:        defaultData?.position        ?? "",
    unit:            defaultData?.unit            ?? "",
    status:          defaultData?.status          ?? "active",
    notes:           defaultData?.notes           ?? "",
  };

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<PersonnelFormValues>({
    resolver: zodResolver(PersonnelFormSchema),
    defaultValues,
  });

  // Reset when defaultData changes (e.g., switching edit targets)
  useEffect(() => {
    reset(defaultValues);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultData?.id]);

  // Auto-fill rankPriority when rank changes
  const watchedRank = watch("rank");
  useEffect(() => {
    const priority = RANK_LABEL_TO_PRIORITY[watchedRank];
    if (priority) setValue("rankPriority", priority);
  }, [watchedRank, setValue]);

  const onSubmit = (data: PersonnelFormValues) => {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createPersonnel(data)
          : await updatePersonnel(defaultData!.id, data);

      if (result.success && result.id) {
        toast({
          variant: "success",
          title: mode === "create" ? "Сотрудник добавлен" : "Изменения сохранены",
          description: `${data.lastName} ${data.firstName}`,
        });
        onSuccess(result.id);
      } else {
        toast({
          variant: "error",
          title: "Ошибка",
          description: result.error ?? "Неизвестная ошибка",
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {/* Name section */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Фамилия" required error={errors.lastName?.message}>
          <input
            {...register("lastName")}
            placeholder="Иванов"
            className={cn(inputClass, errors.lastName && "border-destructive")}
            autoFocus={mode === "create"}
          />
        </Field>
        <Field label="Имя" required error={errors.firstName?.message}>
          <input
            {...register("firstName")}
            placeholder="Иван"
            className={cn(inputClass, errors.firstName && "border-destructive")}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Отчество" error={errors.middleName?.message}>
          <input
            {...register("middleName")}
            placeholder="Иванович"
            className={inputClass}
          />
        </Field>
        <Field label="Личный номер" error={errors.personnelNumber?.message}>
          <input
            {...register("personnelNumber")}
            placeholder="АА001234"
            className={cn(inputClass, "font-mono")}
          />
        </Field>
      </div>

      {/* Rank + Status */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Звание" required error={errors.rank?.message}>
          <Controller
            name="rank"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                className={cn(selectClass, errors.rank && "border-destructive")}
              >
                <option value="">Выберите звание</option>
                {MILITARY_RANKS.map((r) => (
                  <option key={r.label} value={r.label}>
                    {r.label}
                  </option>
                ))}
              </select>
            )}
          />
        </Field>
        <Field label="Статус" required error={errors.status?.message}>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <select {...field} className={selectClass}>
                {PERSONNEL_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
          />
        </Field>
      </div>

      {/* Position + Unit */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Должность" error={errors.position?.message}>
          <input
            {...register("position")}
            placeholder="Специалист"
            className={inputClass}
          />
        </Field>
        <Field label="Подразделение" error={errors.unit?.message}>
          <input
            {...register("unit")}
            placeholder="1-й взвод"
            className={inputClass}
          />
        </Field>
      </div>

      {/* Notes */}
      <Field label="Примечания" error={errors.notes?.message}>
        <textarea
          {...register("notes")}
          rows={3}
          placeholder="Дополнительная информация..."
          className={cn(
            "w-full px-3 py-2 rounded-lg border border-input bg-background",
            "text-sm placeholder:text-muted-foreground resize-none",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
            "transition-shadow"
          )}
        />
      </Field>

      {/* Hidden rankPriority */}
      <input type="hidden" {...register("rankPriority", { valueAsNumber: true })} />

      {/* Footer buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className={cn(
            "h-9 px-4 rounded-lg border border-input text-sm",
            "hover:bg-muted transition-colors disabled:opacity-50"
          )}
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={isPending || (mode === "edit" && !isDirty)}
          className={cn(
            "h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium",
            "hover:bg-primary/90 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "flex items-center gap-2"
          )}
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {mode === "create" ? "Добавить" : "Сохранить"}
        </button>
      </div>
    </form>
  );
}