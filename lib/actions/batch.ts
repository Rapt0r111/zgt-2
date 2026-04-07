"use server";

/**
 * Batch checkin/checkout Server Actions
 *
 * Used by phones, equipment (personal laptops), storage items —
 * the core "mass checkin/checkout" feature across all modules.
 *
 * Each action:
 *   1. Validates session + role
 *   2. Runs DB update in a single transaction
 *   3. Returns typed result for the Client Component
 */

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  phones,
  equipment,
  storageItems,
  equipmentTransfers,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getCurrentUser, requireRole } from "@/lib/auth.server";
import { z } from "zod";

// ── Shared result type ───────────────────────────────────────────────────────
export interface BatchActionResult {
  success: boolean;
  affected: number;
  errors?: string[];
}

// ── Input validators ─────────────────────────────────────────────────────────
const BatchIdsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

// ─────────────────────────────────────────────────────────────────────────────
// PHONES
// ─────────────────────────────────────────────────────────────────────────────

export async function batchCheckinPhones(
  ids: string[]
): Promise<BatchActionResult> {
  await requireRole("operator");

  const parsed = BatchIdsSchema.safeParse({ ids });
  if (!parsed.success) {
    return { success: false, affected: 0, errors: ["Неверные данные"] };
  }

  const now = new Date();

  await db
    .update(phones)
    .set({
      status: "checked_in",
      checkedInAt: now,
      updatedAt: now,
    })
    .where(inArray(phones.id, parsed.data.ids));

  revalidatePath("/phones");

  return { success: true, affected: parsed.data.ids.length };
}

export async function batchCheckoutPhones(
  ids: string[]
): Promise<BatchActionResult> {
  await requireRole("operator");

  const parsed = BatchIdsSchema.safeParse({ ids });
  if (!parsed.success) {
    return { success: false, affected: 0, errors: ["Неверные данные"] };
  }

  const now = new Date();

  await db
    .update(phones)
    .set({
      status: "checked_out",
      checkedOutAt: now,
      updatedAt: now,
    })
    .where(inArray(phones.id, parsed.data.ids));

  revalidatePath("/phones");

  return { success: true, affected: parsed.data.ids.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// EQUIPMENT
// ─────────────────────────────────────────────────────────────────────────────

const BatchEquipmentSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  toPersonnelId: z.string().uuid().optional(),
  toLocation: z.string().max(256).optional(),
  documentRef: z.string().max(128).optional(),
  notes: z.string().max(512).optional(),
});

export async function batchIssueEquipment(
  input: z.infer<typeof BatchEquipmentSchema>
): Promise<BatchActionResult> {
  await requireRole("operator");

  const parsed = BatchEquipmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, affected: 0, errors: ["Неверные данные"] };
  }

  const user = await getCurrentUser();
  const now = new Date();

  // Transaction: update equipment + insert transfer records
  await db.transaction(async (tx) => {
    await tx
      .update(equipment)
      .set({
        status: "in_use",
        personnelId: parsed.data.toPersonnelId ?? null,
        location: parsed.data.toLocation ?? null,
        updatedAt: now,
      })
      .where(inArray(equipment.id, parsed.data.ids));

    // Create transfer history records
    await tx.insert(equipmentTransfers).values(
      parsed.data.ids.map((id) => ({
        equipmentId: id,
        type: "issued" as const,
        toPersonnelId: parsed.data.toPersonnelId ?? null,
        toLocation: parsed.data.toLocation ?? null,
        documentRef: parsed.data.documentRef ?? null,
        notes: parsed.data.notes ?? null,
        transferredAt: now,
        createdBy: user?.id ?? null,
      }))
    );
  });

  revalidatePath("/equipment");

  return { success: true, affected: parsed.data.ids.length };
}

export async function batchReturnEquipment(
  input: z.infer<typeof BatchEquipmentSchema>
): Promise<BatchActionResult> {
  await requireRole("operator");

  const parsed = BatchEquipmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, affected: 0, errors: ["Неверные данные"] };
  }

  const user = await getCurrentUser();
  const now = new Date();

  await db.transaction(async (tx) => {
    // Get current state for transfer history
    const currentItems = await tx
      .select({
        id: equipment.id,
        personnelId: equipment.personnelId,
        location: equipment.location,
      })
      .from(equipment)
      .where(inArray(equipment.id, parsed.data.ids));

    await tx
      .update(equipment)
      .set({
        status: "storage",
        personnelId: null,
        updatedAt: now,
      })
      .where(inArray(equipment.id, parsed.data.ids));

    await tx.insert(equipmentTransfers).values(
      currentItems.map((item) => ({
        equipmentId: item.id,
        type: "returned" as const,
        fromPersonnelId: item.personnelId ?? null,
        fromLocation: item.location ?? null,
        documentRef: parsed.data.documentRef ?? null,
        notes: parsed.data.notes ?? null,
        transferredAt: now,
        createdBy: user?.id ?? null,
      }))
    );
  });

  revalidatePath("/equipment");

  return { success: true, affected: parsed.data.ids.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE ITEMS (флешки + пропуска)
// ─────────────────────────────────────────────────────────────────────────────

export async function batchIssueStorageItems(
  ids: string[],
  personnelId: string
): Promise<BatchActionResult> {
  await requireRole("operator");

  const parsed = BatchIdsSchema.safeParse({ ids });
  const personnelParsed = z.string().uuid().safeParse(personnelId);

  if (!parsed.success || !personnelParsed.success) {
    return { success: false, affected: 0, errors: ["Неверные данные"] };
  }

  const now = new Date();

  await db
    .update(storageItems)
    .set({
      status: "in_use",
      personnelId: personnelParsed.data,
      issuedAt: now,
      returnedAt: null,
      updatedAt: now,
    })
    .where(inArray(storageItems.id, parsed.data.ids));

  revalidatePath("/storage-and-passes");

  return { success: true, affected: parsed.data.ids.length };
}

export async function batchReturnStorageItems(
  ids: string[]
): Promise<BatchActionResult> {
  await requireRole("operator");

  const parsed = BatchIdsSchema.safeParse({ ids });
  if (!parsed.success) {
    return { success: false, affected: 0, errors: ["Неверные данные"] };
  }

  const now = new Date();

  await db
    .update(storageItems)
    .set({
      status: "stock",
      personnelId: null,
      returnedAt: now,
      updatedAt: now,
    })
    .where(inArray(storageItems.id, parsed.data.ids));

  revalidatePath("/storage-and-passes");

  return { success: true, affected: parsed.data.ids.length };
}
