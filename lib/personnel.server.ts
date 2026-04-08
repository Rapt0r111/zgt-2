/**
 * lib/personnel.server.ts — Server-only DB queries
 * Direct DB access — no API round-trip.
 */

import "server-only";

import { db } from "@/db";
import { personnel } from "@/db/schema";
import {
  eq,
  isNull,
  ilike,
  or,
  and,
  desc,
  asc,
  count,
  sql,
} from "drizzle-orm";
import type {
  PersonnelListParams,
  SortField,
  SortDir,
} from "@/types/personnel";
import { PERSONNEL_PAGE_SIZE } from "@/types/personnel";

// ── Types ────────────────────────────────────────────────────────────────────

export type PersonnelRow = typeof personnel.$inferSelect;

export interface PersonnelListResult {
  items:     PersonnelRow[];
  total:     number;
  page:      number;
  pageCount: number;
}

// ── Sort column map ──────────────────────────────────────────────────────────

function getSortExpr(sortBy: SortField, dir: SortDir) {
  const col =
    sortBy === "rank"      ? personnel.rankPriority :
    sortBy === "status"    ? personnel.status :
    sortBy === "unit"      ? personnel.unit :
    sortBy === "createdAt" ? personnel.createdAt :
    personnel.lastName;

  return dir === "desc" ? desc(col) : asc(col);
}

// ── List ─────────────────────────────────────────────────────────────────────

export async function getPersonnelList(
  params: PersonnelListParams = {}
): Promise<PersonnelListResult> {
  const {
    q,
    status,
    unit,
    rank,
    page = 1,
    sortBy = "lastName",
    sortDir = "asc",
  } = params;

  const conditions = [isNull(personnel.deletedAt)];

  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(personnel.lastName,        term),
        ilike(personnel.firstName,       term),
        ilike(personnel.middleName,      term),
        ilike(personnel.personnelNumber, term),
        ilike(personnel.position,        term),
        ilike(personnel.unit,            term),
        ilike(personnel.rank,            term),
      )!
    );
  }

  if (status) {
    conditions.push(eq(personnel.status, status));
  }

  if (unit?.trim()) {
    conditions.push(ilike(personnel.unit, `%${unit.trim()}%`));
  }

  if (rank?.trim()) {
    conditions.push(eq(personnel.rank, rank.trim()));
  }

  const where = and(...conditions);

  const [{ total }] = await db
    .select({ total: count() })
    .from(personnel)
    .where(where);

  const items = await db
    .select()
    .from(personnel)
    .where(where)
    .orderBy(getSortExpr(sortBy, sortDir), asc(personnel.lastName))
    .limit(PERSONNEL_PAGE_SIZE)
    .offset((page - 1) * PERSONNEL_PAGE_SIZE);

  const totalNum = Number(total);

  return {
    items,
    total:     totalNum,
    page,
    pageCount: Math.max(1, Math.ceil(totalNum / PERSONNEL_PAGE_SIZE)),
  };
}

// ── Single record ─────────────────────────────────────────────────────────────

export async function getPersonnelById(id: string): Promise<PersonnelRow | null> {
  const [row] = await db
    .select()
    .from(personnel)
    .where(and(eq(personnel.id, id), isNull(personnel.deletedAt)))
    .limit(1);
  return row ?? null;
}

// ── Distinct units (for filter dropdown) ─────────────────────────────────────

export async function getDistinctUnits(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ unit: personnel.unit })
    .from(personnel)
    .where(
      and(
        isNull(personnel.deletedAt),
        sql`${personnel.unit} IS NOT NULL AND ${personnel.unit} != ''`
      )
    )
    .orderBy(asc(personnel.unit));

  return rows.map((r) => r.unit).filter((u): u is string => Boolean(u));
}

// ── Stats for header cards ────────────────────────────────────────────────────

export interface PersonnelStats {
  total:     number;
  active:    number;
  detached:  number;
  hospital:  number;
  leave:     number;
  dismissed: number;
}

export async function getPersonnelStats(): Promise<PersonnelStats> {
  const rows = await db
    .select({ status: personnel.status, cnt: count() })
    .from(personnel)
    .where(isNull(personnel.deletedAt))
    .groupBy(personnel.status);

  const map: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    const n = Number(r.cnt);
    map[r.status] = n;
    total += n;
  }

  return {
    total,
    active:    map.active    ?? 0,
    detached:  map.detached  ?? 0,
    hospital:  map.hospital  ?? 0,
    leave:     map.leave     ?? 0,
    dismissed: map.dismissed ?? 0,
  };
}

// ── Update search vector helper (call after insert/update) ───────────────────

export async function refreshSearchVector(personnelId: string): Promise<void> {
  await db.execute(sql`
    UPDATE personnel
    SET search_vector = to_tsvector(
      'russian',
      coalesce(last_name, '')  || ' ' ||
      coalesce(first_name, '') || ' ' ||
      coalesce(middle_name, '') || ' ' ||
      coalesce(personnel_number, '') || ' ' ||
      coalesce(rank, '') || ' ' ||
      coalesce(position, '') || ' ' ||
      coalesce(unit, '') || ' ' ||
      coalesce(notes, '')
    )
    WHERE id = ${personnelId}
  `);
}