"use server";

/**
 * lib/actions/equipment.ts — Equipment CRUD + Batch Server Actions
 *
 * Fixes applied:
 *   1. batchMoveEquipment now uses "issued" transfer type instead of "returned"
 *      (semantically: device is "issued" to a new location)
 *   2. personnelId "" → null coercion made explicit
 */

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { equipment, storageDevices, equipmentTransfers } from "@/db/schema";
import { eq, inArray, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { getCurrentUser, requireRole } from "@/lib/auth.server";
import {
  EquipmentFormSchema,
  BatchIssueSchema,
  BatchMoveSchema,
  DEVICE_TYPES,
} from "@/types/equipment";
import type {
  EquipmentFormValues,
  BatchIssueValues,
  BatchMoveValues,
} from "@/types/equipment";
import { refreshEquipmentSearchVector } from "@/lib/equipment.server";

// ── Result types ───────────────────────────────────────────────────────────

export interface EquipmentActionResult {
  success: boolean;
  error?:  string;
  id?:     string;
}

export interface BatchActionResult {
  success:  boolean;
  affected: number;
  errors?:  string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function deviceTypeToCategory(
  deviceType: string
): "workstation" | "laptop" | "server" | "other" {
  const found = DEVICE_TYPES.find((d) => d.value === deviceType);
  return (found?.category ?? "other") as "workstation" | "laptop" | "server" | "other";
}

/** Normalise personnelId: "" or undefined → null */
function toPersonnelId(v: string | undefined | null): string | null {
  return v && v.trim() !== "" ? v : null;
}

// ── Create ─────────────────────────────────────────────────────────────────

export async function createEquipment(
  data: EquipmentFormValues
): Promise<EquipmentActionResult> {
  try {
    await requireRole("operator");
    const user = await getCurrentUser();

    const parsed = EquipmentFormSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error:   parsed.error.issues[0]?.message ?? "Ошибка валидации",
      };
    }

    const v        = parsed.data;
    const category = deviceTypeToCategory(v.deviceType);

    const created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(equipment)
        .values({
          category,
          isPersonal:       false,
          displayName:      v.displayName,
          inventoryNumber:  v.inventoryNumber  || null,
          serialNumber:     v.serialNumber     || null,
          mniSerialNumber:  v.mniSerialNumber  || null,
          manufacturer:     v.manufacturer     || null,
          model:            v.model            || null,
          cpu:              v.cpu              || null,
          ramGb:            v.ramGb            ?? null,
          storageType:      v.storageType      || null,
          storageGb:        v.storageGb        ?? null,
          os:               v.os               || null,
          hasCharger:       v.hasCharger       ?? null,
          hasMouse:         v.hasMouse         ?? null,
          hasBag:           v.hasBag           ?? null,
          isChargerWorking: v.isChargerWorking ?? null,
          isMouseWorking:   v.isMouseWorking   ?? null,
          personnelId:      toPersonnelId(v.personnelId),
          location:         v.location         || null,
          status:           v.status,
          createdBy:        user?.id            ?? null,
        })
        .returning({ id: equipment.id });

      if (v.storageDevices?.length) {
        await tx.insert(storageDevices).values(
          v.storageDevices.map((sd) => ({
            equipmentId:     row.id,
            type:            sd.type            || null,
            inventoryNumber: sd.inventoryNumber || null,
            serialNumber:    sd.serialNumber,
            manufacturer:    sd.manufacturer    || null,
            model:           sd.model           || null,
            capacityGb:      sd.capacityGb      ?? 0,
            interface:       sd.interface       || null,
          }))
        );
      }

      return row;
    });

    refreshEquipmentSearchVector(created.id).catch(console.warn);

    revalidatePath("/equipment");
    revalidatePath("/");

    return { success: true, id: created.id };
  } catch (err) {
    console.error("[createEquipment]", err);
    if (err instanceof Error && err.message === "Forbidden") {
      return { success: false, error: "Недостаточно прав доступа" };
    }
    return { success: false, error: "Ошибка при создании записи" };
  }
}

// ── Update ─────────────────────────────────────────────────────────────────

export async function updateEquipment(
  id: string,
  data: EquipmentFormValues
): Promise<EquipmentActionResult> {
  try {
    await requireRole("operator");

    if (!z.string().uuid().safeParse(id).success) {
      return { success: false, error: "Неверный идентификатор" };
    }

    const parsed = EquipmentFormSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error:   parsed.error.issues[0]?.message ?? "Ошибка валидации",
      };
    }

    const v        = parsed.data;
    const category = deviceTypeToCategory(v.deviceType);

    await db.transaction(async (tx) => {
      await tx
        .update(equipment)
        .set({
          category,
          displayName:      v.displayName,
          inventoryNumber:  v.inventoryNumber  || null,
          serialNumber:     v.serialNumber     || null,
          mniSerialNumber:  v.mniSerialNumber  || null,
          manufacturer:     v.manufacturer     || null,
          model:            v.model            || null,
          cpu:              v.cpu              || null,
          ramGb:            v.ramGb            ?? null,
          storageType:      v.storageType      || null,
          storageGb:        v.storageGb        ?? null,
          os:               v.os               || null,
          hasCharger:       v.hasCharger       ?? null,
          hasMouse:         v.hasMouse         ?? null,
          hasBag:           v.hasBag           ?? null,
          isChargerWorking: v.isChargerWorking ?? null,
          isMouseWorking:   v.isMouseWorking   ?? null,
          personnelId:      toPersonnelId(v.personnelId),
          location:         v.location         || null,
          status:           v.status,
          updatedAt:        new Date(),
        })
        .where(eq(equipment.id, id));

      // Replace storage devices: soft-delete existing, insert new
      if (v.storageDevices !== undefined) {
        await tx
          .update(storageDevices)
          .set({ deletedAt: new Date() })
          .where(
            and(
              eq(storageDevices.equipmentId, id),
              isNull(storageDevices.deletedAt)
            )
          );

        if (v.storageDevices.length > 0) {
          await tx.insert(storageDevices).values(
            v.storageDevices.map((sd) => ({
              equipmentId:     id,
              type:            sd.type            || null,
              inventoryNumber: sd.inventoryNumber || null,
              serialNumber:    sd.serialNumber,
              manufacturer:    sd.manufacturer    || null,
              model:           sd.model           || null,
              capacityGb:      sd.capacityGb      ?? 0,
              interface:       sd.interface       || null,
            }))
          );
        }
      }
    });

    refreshEquipmentSearchVector(id).catch(console.warn);

    revalidatePath("/equipment");
    revalidatePath(`/equipment/${id}`);

    return { success: true, id };
  } catch (err) {
    console.error("[updateEquipment]", err);
    if (err instanceof Error && err.message === "Forbidden") {
      return { success: false, error: "Недостаточно прав доступа" };
    }
    return { success: false, error: "Ошибка при обновлении записи" };
  }
}

// ── Soft-delete ────────────────────────────────────────────────────────────

export async function deleteEquipment(
  id: string
): Promise<EquipmentActionResult> {
  try {
    await requireRole("admin");

    if (!z.string().uuid().safeParse(id).success) {
      return { success: false, error: "Неверный идентификатор" };
    }

    await db
      .update(equipment)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(equipment.id, id));

    revalidatePath("/equipment");

    return { success: true };
  } catch (err) {
    console.error("[deleteEquipment]", err);
    return { success: false, error: "Ошибка при удалении" };
  }
}

// ── Batch issue (выдача) ───────────────────────────────────────────────────

export async function batchIssueEquipmentItems(
  input: BatchIssueValues
): Promise<BatchActionResult> {
  try {
    await requireRole("operator");
    const user = await getCurrentUser();

    const parsed = BatchIssueSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, affected: 0, errors: ["Неверные данные"] };
    }

    const { ids, toPersonnelId, toLocation, documentRef, notes } = parsed.data;
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(equipment)
        .set({
          status:      "in_use",
          personnelId: toPersonnelId ?? null,
          location:    toLocation    ?? null,
          updatedAt:   now,
        })
        .where(inArray(equipment.id, ids));

      await tx.insert(equipmentTransfers).values(
        ids.map((id) => ({
          equipmentId:   id,
          type:          "issued" as const,
          toPersonnelId: toPersonnelId ?? null,
          toLocation:    toLocation    ?? null,
          documentRef:   documentRef   ?? null,
          notes:         notes         ?? null,
          transferredAt: now,
          createdBy:     user?.id      ?? null,
        }))
      );
    });

    revalidatePath("/equipment");

    return { success: true, affected: ids.length };
  } catch (err) {
    console.error("[batchIssueEquipment]", err);
    return { success: false, affected: 0, errors: ["Ошибка транзакции"] };
  }
}

// ── Batch return (сдача на склад) ─────────────────────────────────────────

export async function batchReturnEquipmentItems(
  ids: string[],
  opts?: { documentRef?: string; notes?: string }
): Promise<BatchActionResult> {
  try {
    await requireRole("operator");
    const user = await getCurrentUser();

    const parsed = z.array(z.string().uuid()).min(1).max(500).safeParse(ids);
    if (!parsed.success) {
      return { success: false, affected: 0, errors: ["Неверные данные"] };
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      // Capture current state for audit trail
      const current = await tx
        .select({
          id:          equipment.id,
          personnelId: equipment.personnelId,
          location:    equipment.location,
        })
        .from(equipment)
        .where(inArray(equipment.id, parsed.data));

      await tx
        .update(equipment)
        .set({ status: "storage", personnelId: null, updatedAt: now })
        .where(inArray(equipment.id, parsed.data));

      await tx.insert(equipmentTransfers).values(
        current.map((item) => ({
          equipmentId:      item.id,
          type:             "returned" as const,
          fromPersonnelId:  item.personnelId ?? null,
          fromLocation:     item.location    ?? null,
          documentRef:      opts?.documentRef ?? null,
          notes:            opts?.notes       ?? null,
          transferredAt:    now,
          createdBy:        user?.id          ?? null,
        }))
      );
    });

    revalidatePath("/equipment");

    return { success: true, affected: parsed.data.length };
  } catch (err) {
    console.error("[batchReturnEquipment]", err);
    return { success: false, affected: 0, errors: ["Ошибка транзакции"] };
  }
}

// ── Batch move (перемещение между локациями) ──────────────────────────────

export async function batchMoveEquipment(
  input: BatchMoveValues
): Promise<BatchActionResult> {
  try {
    await requireRole("operator");
    const user = await getCurrentUser();

    const parsed = BatchMoveSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, affected: 0, errors: ["Неверные данные"] };
    }

    const { ids, toLocation, notes } = parsed.data;
    const now = new Date();

    await db.transaction(async (tx) => {
      const current = await tx
        .select({ id: equipment.id, location: equipment.location })
        .from(equipment)
        .where(inArray(equipment.id, ids));

      await tx
        .update(equipment)
        .set({ location: toLocation, updatedAt: now })
        .where(inArray(equipment.id, ids));

      // FIX: was incorrectly using "returned" type for moves.
      // Using "issued" (device is being issued to a new location).
      // from_location + to_location fields make the move clear in history.
      await tx.insert(equipmentTransfers).values(
        current.map((item) => ({
          equipmentId:   item.id,
          type:          "issued" as const,
          fromLocation:  item.location ?? null,
          toLocation:    toLocation,
          notes:         notes ? `Перемещение. ${notes}` : "Перемещение",
          transferredAt: now,
          createdBy:     user?.id ?? null,
        }))
      );
    });

    revalidatePath("/equipment");

    return { success: true, affected: ids.length };
  } catch (err) {
    console.error("[batchMoveEquipment]", err);
    return { success: false, affected: 0, errors: ["Ошибка транзакции"] };
  }
}