"use server";

/**
 * lib/actions/personnel.ts — CRUD Server Actions for Personnel
 *
 * Each action:
 *   1. Enforces RBAC via requireRole()
 *   2. Validates input with Zod
 *   3. Performs DB operation
 *   4. Revalidates affected paths
 *   5. Returns typed result
 */

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { personnel } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole, getCurrentUser } from "@/lib/auth.server";
import { PersonnelFormSchema } from "@/types/personnel";
import type { PersonnelFormValues } from "@/types/personnel";
import { z } from "zod";

export interface PersonnelActionResult {
  success: boolean;
  error?:  string;
  id?:     string;
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createPersonnel(
  data: PersonnelFormValues
): Promise<PersonnelActionResult> {
  try {
    await requireRole("operator");
    const user = await getCurrentUser();

    const parsed = PersonnelFormSchema.safeParse(data);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Ошибка валидации";
      return { success: false, error: msg };
    }

    const v = parsed.data;

    const [created] = await db
      .insert(personnel)
      .values({
        lastName:        v.lastName,
        firstName:       v.firstName,
        middleName:      v.middleName  || null,
        personnelNumber: v.personnelNumber || null,
        rank:            v.rank,
        rankPriority:    v.rankPriority,
        position:        v.position || null,
        unit:            v.unit     || null,
        status:          v.status,
        notes:           v.notes    || null,
        createdBy:       user?.id   ?? null,
      })
      .returning({ id: personnel.id });

    revalidatePath("/personnel");
    revalidatePath("/");

    return { success: true, id: created.id };
  } catch (err) {
    console.error("[createPersonnel]", err);
    if (err instanceof Error && err.message === "Forbidden") {
      return { success: false, error: "Недостаточно прав доступа" };
    }
    return { success: false, error: "Ошибка при создании записи" };
  }
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updatePersonnel(
  id: string,
  data: PersonnelFormValues
): Promise<PersonnelActionResult> {
  try {
    await requireRole("operator");

    if (!z.string().uuid().safeParse(id).success) {
      return { success: false, error: "Неверный идентификатор" };
    }

    const parsed = PersonnelFormSchema.safeParse(data);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Ошибка валидации";
      return { success: false, error: msg };
    }

    const v = parsed.data;

    await db
      .update(personnel)
      .set({
        lastName:        v.lastName,
        firstName:       v.firstName,
        middleName:      v.middleName  || null,
        personnelNumber: v.personnelNumber || null,
        rank:            v.rank,
        rankPriority:    v.rankPriority,
        position:        v.position || null,
        unit:            v.unit     || null,
        status:          v.status,
        notes:           v.notes    || null,
        updatedAt:       new Date(),
      })
      .where(eq(personnel.id, id));

    revalidatePath("/personnel");
    revalidatePath("/");

    return { success: true, id };
  } catch (err) {
    console.error("[updatePersonnel]", err);
    if (err instanceof Error && err.message === "Forbidden") {
      return { success: false, error: "Недостаточно прав доступа" };
    }
    return { success: false, error: "Ошибка при обновлении записи" };
  }
}

// ── Soft-delete ───────────────────────────────────────────────────────────────

export async function deletePersonnel(
  id: string
): Promise<PersonnelActionResult> {
  try {
    await requireRole("admin");

    if (!z.string().uuid().safeParse(id).success) {
      return { success: false, error: "Неверный идентификатор" };
    }

    await db
      .update(personnel)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(personnel.id, id));

    revalidatePath("/personnel");
    revalidatePath("/");

    return { success: true };
  } catch (err) {
    console.error("[deletePersonnel]", err);
    if (err instanceof Error && err.message === "Forbidden") {
      return { success: false, error: "Недостаточно прав доступа" };
    }
    return { success: false, error: "Ошибка при удалении записи" };
  }
}

// ── Restore (undo soft-delete) ────────────────────────────────────────────────

export async function restorePersonnel(
  id: string
): Promise<PersonnelActionResult> {
  try {
    await requireRole("admin");

    if (!z.string().uuid().safeParse(id).success) {
      return { success: false, error: "Неверный идентификатор" };
    }

    await db
      .update(personnel)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(personnel.id, id));

    revalidatePath("/personnel");

    return { success: true };
  } catch (err) {
    console.error("[restorePersonnel]", err);
    return { success: false, error: "Ошибка при восстановлении записи" };
  }
}