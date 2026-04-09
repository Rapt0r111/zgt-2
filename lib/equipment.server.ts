/**
 * lib/equipment.server.ts — Server-only DB queries for equipment
 */

import "server-only";

import { db } from "@/db";
import { equipment, personnel, storageDevices, equipmentTransfers, user } from "@/db/schema";
import {
  eq, isNull, ilike, or, and, desc, asc, count, sql, inArray,
} from "drizzle-orm";
import type { EquipmentListParams, EquipmentSortField, SortDir } from "@/types/equipment";
import { EQUIPMENT_PAGE_SIZE } from "@/types/equipment";

// ── Types ──────────────────────────────────────────────────────────────────

export type EquipmentRow = typeof equipment.$inferSelect & {
  personnelName?: string | null;
  personnelRank?: string | null;
};

export type EquipmentWithRelations = EquipmentRow & {
  storageDevices: (typeof storageDevices.$inferSelect)[];
  transfers:      TransferRow[];
};

export type TransferRow = typeof equipmentTransfers.$inferSelect & {
  fromPersonnelName?: string | null;
  toPersonnelName?:   string | null;
  performedByName?:   string | null;
};

export interface EquipmentListResult {
  items:     EquipmentRow[];
  total:     number;
  page:      number;
  pageCount: number;
}

export interface EquipmentStats {
  total:   number;
  inUse:   number;
  storage: number;
  repair:  number;
  broken:  number;
}

// ── Sort helper ────────────────────────────────────────────────────────────

function getSortExpr(sortBy: EquipmentSortField, dir: SortDir) {
  const col =
    sortBy === "inventoryNumber" ? equipment.inventoryNumber :
    sortBy === "status"          ? equipment.status :
    sortBy === "category"        ? equipment.category :
    sortBy === "location"        ? equipment.location :
    sortBy === "createdAt"       ? equipment.createdAt :
    equipment.displayName;

  return dir === "desc" ? desc(col) : asc(col);
}

// ── List ───────────────────────────────────────────────────────────────────

export async function getEquipmentList(
  params: EquipmentListParams = {}
): Promise<EquipmentListResult> {
  const {
    q, status, category, location,
    page = 1,
    sortBy  = "displayName",
    sortDir = "asc",
  } = params;

  const conditions = [
    isNull(equipment.deletedAt),
    eq(equipment.isPersonal, false),
  ];

  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(equipment.displayName,     term),
        ilike(equipment.inventoryNumber, term),
        ilike(equipment.serialNumber,    term),
        ilike(equipment.manufacturer,    term),
        ilike(equipment.model,           term),
        ilike(equipment.location,        term),
      )!
    );
  }

  if (status)   conditions.push(eq(equipment.status,   status   as any));
  if (category) conditions.push(eq(equipment.category, category as any));
  if (location?.trim()) conditions.push(ilike(equipment.location, `%${location.trim()}%`));

  const where = and(...conditions);

  const [{ total }] = await db
    .select({ total: count() })
    .from(equipment)
    .where(where);

  const rows = await db
    .select({
      id:              equipment.id,
      category:        equipment.category,
      isPersonal:      equipment.isPersonal,
      displayName:     equipment.displayName,
      inventoryNumber: equipment.inventoryNumber,
      serialNumber:    equipment.serialNumber,
      mniSerialNumber: equipment.mniSerialNumber,
      manufacturer:    equipment.manufacturer,
      model:           equipment.model,
      cpu:             equipment.cpu,
      ramGb:           equipment.ramGb,
      storageType:     equipment.storageType,
      storageGb:       equipment.storageGb,
      os:              equipment.os,
      hasCharger:      equipment.hasCharger,
      hasMouse:        equipment.hasMouse,
      hasBag:          equipment.hasBag,
      isChargerWorking: equipment.isChargerWorking,
      isMouseWorking:  equipment.isMouseWorking,
      personnelId:     equipment.personnelId,
      location:        equipment.location,
      status:          equipment.status,
      searchVector:    equipment.searchVector,
      createdAt:       equipment.createdAt,
      updatedAt:       equipment.updatedAt,
      deletedAt:       equipment.deletedAt,
      createdBy:       equipment.createdBy,
      personnelName:   sql<string | null>`${personnel.lastName} || ' ' || ${personnel.firstName}`,
      personnelRank:   personnel.rank,
    })
    .from(equipment)
    .leftJoin(personnel, eq(equipment.personnelId, personnel.id))
    .where(where)
    .orderBy(getSortExpr(sortBy, sortDir), asc(equipment.displayName))
    .limit(EQUIPMENT_PAGE_SIZE)
    .offset((page - 1) * EQUIPMENT_PAGE_SIZE);

  const totalNum = Number(total);

  return {
    items:     rows,
    total:     totalNum,
    page,
    pageCount: Math.max(1, Math.ceil(totalNum / EQUIPMENT_PAGE_SIZE)),
  };
}

// ── Single record with relations ──────────────────────────────────────────

export async function getEquipmentById(id: string): Promise<EquipmentWithRelations | null> {
  const rows = await db
    .select({
      id:              equipment.id,
      category:        equipment.category,
      isPersonal:      equipment.isPersonal,
      displayName:     equipment.displayName,
      inventoryNumber: equipment.inventoryNumber,
      serialNumber:    equipment.serialNumber,
      mniSerialNumber: equipment.mniSerialNumber,
      manufacturer:    equipment.manufacturer,
      model:           equipment.model,
      cpu:             equipment.cpu,
      ramGb:           equipment.ramGb,
      storageType:     equipment.storageType,
      storageGb:       equipment.storageGb,
      os:              equipment.os,
      hasCharger:      equipment.hasCharger,
      hasMouse:        equipment.hasMouse,
      hasBag:          equipment.hasBag,
      isChargerWorking: equipment.isChargerWorking,
      isMouseWorking:  equipment.isMouseWorking,
      personnelId:     equipment.personnelId,
      location:        equipment.location,
      status:          equipment.status,
      searchVector:    equipment.searchVector,
      createdAt:       equipment.createdAt,
      updatedAt:       equipment.updatedAt,
      deletedAt:       equipment.deletedAt,
      createdBy:       equipment.createdBy,
      personnelName:   sql<string | null>`${personnel.lastName} || ' ' || ${personnel.firstName}`,
      personnelRank:   personnel.rank,
    })
    .from(equipment)
    .leftJoin(personnel, eq(equipment.personnelId, personnel.id))
    .where(and(eq(equipment.id, id), isNull(equipment.deletedAt)))
    .limit(1);

  if (!rows[0]) return null;

  const [devices, transfers] = await Promise.all([
    db.select().from(storageDevices)
      .where(and(eq(storageDevices.equipmentId, id), isNull(storageDevices.deletedAt)))
      .orderBy(asc(storageDevices.createdAt)),

    getEquipmentTransferHistory(id),
  ]);

  return { ...rows[0], storageDevices: devices, transfers };
}

// ── Transfer history ──────────────────────────────────────────────────────

export async function getEquipmentTransferHistory(equipmentId: string): Promise<TransferRow[]> {
  const fromP = personnel;
  const toP   = { ...personnel } as typeof personnel;

  const rows = await db.execute(sql`
    SELECT
      t.id,
      t.equipment_id       AS "equipmentId",
      t.type,
      t.from_personnel_id  AS "fromPersonnelId",
      t.to_personnel_id    AS "toPersonnelId",
      t.from_location      AS "fromLocation",
      t.to_location        AS "toLocation",
      t.document_ref       AS "documentRef",
      t.notes,
      t.transferred_at     AS "transferredAt",
      t.created_by         AS "createdBy",
      fp.last_name || ' ' || fp.first_name AS "fromPersonnelName",
      tp.last_name || ' ' || tp.first_name AS "toPersonnelName",
      u.name AS "performedByName"
    FROM equipment_transfers t
    LEFT JOIN personnel fp ON fp.id = t.from_personnel_id
    LEFT JOIN personnel tp ON tp.id = t.to_personnel_id
    LEFT JOIN "user"    u  ON u.id  = t.created_by
    WHERE t.equipment_id = ${equipmentId}
    ORDER BY t.transferred_at DESC
    LIMIT 100
  `);

  return rows.rows as TransferRow[];
}

// ── Stats ─────────────────────────────────────────────────────────────────

export async function getEquipmentStats(): Promise<EquipmentStats> {
  const rows = await db
    .select({ status: equipment.status, cnt: count() })
    .from(equipment)
    .where(and(isNull(equipment.deletedAt), eq(equipment.isPersonal, false)))
    .groupBy(equipment.status);

  const map: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    const n = Number(r.cnt);
    map[r.status] = n;
    total += n;
  }

  return {
    total,
    inUse:   map.in_use  ?? 0,
    storage: map.storage ?? 0,
    repair:  map.repair  ?? 0,
    broken:  map.broken  ?? 0,
  };
}

// ── Distinct locations ────────────────────────────────────────────────────

export async function getDistinctLocations(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ location: equipment.location })
    .from(equipment)
    .where(
      and(
        isNull(equipment.deletedAt),
        sql`${equipment.location} IS NOT NULL AND ${equipment.location} != ''`
      )
    )
    .orderBy(asc(equipment.location));

  return rows.map((r) => r.location).filter((l): l is string => Boolean(l));
}

// ── Refresh search vector ─────────────────────────────────────────────────

export async function refreshEquipmentSearchVector(equipmentId: string): Promise<void> {
  await db.execute(sql`
    UPDATE equipment
    SET search_vector = to_tsvector(
      'russian',
      coalesce(display_name, '')     || ' ' ||
      coalesce(inventory_number, '') || ' ' ||
      coalesce(serial_number, '')    || ' ' ||
      coalesce(mni_serial_number, '') || ' ' ||
      coalesce(manufacturer, '')     || ' ' ||
      coalesce(model, '')            || ' ' ||
      coalesce(location, '')         || ' ' ||
      coalesce(os, '')               || ' ' ||
      coalesce(cpu, '')
    )
    WHERE id = ${equipmentId}
  `);
}