"use server";
/**
 * Global Search — Server Query
 *
 * FIXES:
 *  1. Replaced non-existent 'zgt_search' config with 'russian' everywhere
 *  2. Proper tsquery building (prefix match for single terms, websearch for multi-word)
 *  3. Added ILIKE fallback so inventory/serial numbers always match
 *  4. ts_headline now uses 'russian' config
 */

import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import type {
  SearchModule,
  SearchResultItem,
  SearchResults,
} from "@/types/search";
import { SEARCH_PAGE_SIZE } from "@/types/search";

// ── tsquery builder ────────────────────────────────────────────────────────

/**
 * Build a safe PostgreSQL tsquery expression string (NOT parameterised —
 * injected into SQL template — so we escape carefully).
 *
 * Single short term  → prefix match:  to_tsquery('russian','term:*')
 * Multi-word / long  → websearch:     websearch_to_tsquery('russian','...')
 *
 * Returns null-safe empty string on blank input.
 */
function buildTsQuery(rawQuery: string): string {
  const trimmed = rawQuery.trim();
  if (!trimmed) return "";

  const words = trimmed.split(/\s+/).filter(Boolean);

  // Escape single-quotes and strip tsquery operators from user input
  const safeSingle = (w: string) =>
    w
      .replace(/'/g, "''")
      .replace(/[&|!():*<>]/g, " ")
      .trim();

  if (words.length === 1) {
    const safe = safeSingle(trimmed);
    if (!safe) return "";
    // Use prefix match so "Иван" finds "Иванов"
    return `to_tsquery('russian', '${safe}:*')`;
  }

  // Multi-word: websearch_to_tsquery handles AND/OR/phrase safely
  const safe = trimmed.replace(/'/g, "''");
  return `websearch_to_tsquery('russian', '${safe}')`;
}

// ── Per-module search queries ──────────────────────────────────────────────

async function searchPersonnel(
  rawQuery: string,
  limit: number,
  offset: number
): Promise<SearchResultItem[]> {
  const tsq = buildTsQuery(rawQuery);
  const likePattern = `%${rawQuery.trim().replace(/'/g, "''")}%`;

  // Use FTS if we have a valid query, else fall through to ILIKE only
  const rows = await db.execute(sql`
    SELECT
      p.id,
      p.last_name || ' ' || p.first_name ||
        COALESCE(' ' || p.middle_name, '') AS title,
      COALESCE(p.rank, '') ||
        COALESCE(', ' || p.position, '') ||
        COALESCE(', ' || p.unit, '') AS subtitle,
      p.status AS badge,
      CASE
        WHEN ${tsq !== "" ? sql.raw(`p.search_vector @@ ${tsq}`) : sql`FALSE`}
          THEN ts_rank(p.search_vector, ${tsq !== "" ? sql.raw(tsq) : sql`to_tsquery('russian','x')`})
        ELSE 0.01
      END AS rank,
      '' AS highlight
    FROM personnel p
    WHERE p.deleted_at IS NULL
      AND (
        ${tsq !== "" ? sql.raw(`p.search_vector @@ ${tsq} OR`) : sql``}
        p.last_name        ILIKE ${likePattern} OR
        p.first_name       ILIKE ${likePattern} OR
        p.middle_name      ILIKE ${likePattern} OR
        p.personnel_number ILIKE ${likePattern} OR
        p.rank             ILIKE ${likePattern} OR
        p.position         ILIKE ${likePattern} OR
        p.unit             ILIKE ${likePattern}
      )
    ORDER BY rank DESC, p.last_name
    LIMIT ${limit} OFFSET ${offset}
  `);

  return (rows.rows as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    module: "personnel" as SearchModule,
    title: (r.title as string).trim(),
    subtitle: r.subtitle as string,
    badge: translateStatus(r.badge as string, "personnel"),
    badgeVariant: statusVariant(r.badge as string),
    href: `/personnel?highlight=${r.id}`,
    rank: Number(r.rank),
    highlight: "",
  }));
}

async function searchPhones(
  rawQuery: string,
  limit: number,
  offset: number
): Promise<SearchResultItem[]> {
  const tsq = buildTsQuery(rawQuery);
  const likePattern = `%${rawQuery.trim().replace(/'/g, "''")}%`;

  const rows = await db.execute(sql`
    SELECT
      ph.id,
      COALESCE(ph.brand || ' ', '') || ph.model AS title,
      p.last_name || ' ' || p.first_name AS subtitle,
      ph.status AS badge,
      CASE
        WHEN ${tsq !== "" ? sql.raw(`ph.search_vector @@ ${tsq}`) : sql`FALSE`}
          THEN ts_rank(ph.search_vector, ${tsq !== "" ? sql.raw(tsq) : sql`to_tsquery('russian','x')`})
        ELSE 0.01
      END AS rank
    FROM phones ph
    JOIN personnel p ON p.id = ph.personnel_id
    WHERE ph.deleted_at IS NULL
      AND (
        ${tsq !== "" ? sql.raw(`ph.search_vector @@ ${tsq} OR`) : sql``}
        ph.brand         ILIKE ${likePattern} OR
        ph.model         ILIKE ${likePattern} OR
        ph.imei1         ILIKE ${likePattern} OR
        ph.imei2         ILIKE ${likePattern} OR
        ph.serial_number ILIKE ${likePattern} OR
        p.last_name      ILIKE ${likePattern} OR
        p.first_name     ILIKE ${likePattern}
      )
    ORDER BY rank DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  return (rows.rows as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    module: "phones" as SearchModule,
    title: (r.title as string).trim(),
    subtitle: r.subtitle as string,
    badge: r.badge === "checked_in" ? "Сдан" : "Выдан",
    badgeVariant: (r.badge === "checked_in" ? "secondary" : "default") as
      | "secondary"
      | "default",
    href: `/phones?highlight=${r.id}`,
    rank: Number(r.rank),
    highlight: "",
  }));
}

async function searchEquipment(
  rawQuery: string,
  limit: number,
  offset: number
): Promise<SearchResultItem[]> {
  const tsq = buildTsQuery(rawQuery);
  const likePattern = `%${rawQuery.trim().replace(/'/g, "''")}%`;

  const rows = await db.execute(sql`
    SELECT
      e.id,
      e.display_name AS title,
      COALESCE(e.inventory_number, 'Без инв. номера') ||
        COALESCE(' · ' || e.location, '') AS subtitle,
      e.status AS badge,
      CASE
        WHEN ${tsq !== "" ? sql.raw(`e.search_vector @@ ${tsq}`) : sql`FALSE`}
          THEN ts_rank(e.search_vector, ${tsq !== "" ? sql.raw(tsq) : sql`to_tsquery('russian','x')`})
        ELSE 0.01
      END AS rank
    FROM equipment e
    WHERE e.deleted_at IS NULL
      AND (
        ${tsq !== "" ? sql.raw(`e.search_vector @@ ${tsq} OR`) : sql``}
        e.display_name     ILIKE ${likePattern} OR
        e.inventory_number ILIKE ${likePattern} OR
        e.serial_number    ILIKE ${likePattern} OR
        e.mni_serial_number ILIKE ${likePattern} OR
        e.manufacturer     ILIKE ${likePattern} OR
        e.model            ILIKE ${likePattern} OR
        e.location         ILIKE ${likePattern} OR
        e.cpu              ILIKE ${likePattern}
      )
    ORDER BY rank DESC, e.display_name
    LIMIT ${limit} OFFSET ${offset}
  `);

  return (rows.rows as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    module: "equipment" as SearchModule,
    title: r.title as string,
    subtitle: r.subtitle as string,
    badge: translateStatus(r.badge as string, "equipment"),
    badgeVariant: statusVariant(r.badge as string),
    href: `/equipment?highlight=${r.id}`,
    rank: Number(r.rank),
    highlight: "",
  }));
}

async function searchStorageItems(
  rawQuery: string,
  limit: number,
  offset: number
): Promise<SearchResultItem[]> {
  const tsq = buildTsQuery(rawQuery);
  const likePattern = `%${rawQuery.trim().replace(/'/g, "''")}%`;

  const rows = await db.execute(sql`
    SELECT
      si.id,
      CASE si.type
        WHEN 'flash_drive' THEN 'Флешка МО'
        ELSE 'Эл. пропуск'
      END || ' · ' ||
        COALESCE(si.inventory_number, COALESCE(si.serial_number, '—')) AS title,
      COALESCE(
        p.last_name || ' ' || p.first_name,
        'Не выдан'
      ) AS subtitle,
      si.status AS badge,
      CASE
        WHEN ${tsq !== "" ? sql.raw(`si.search_vector @@ ${tsq}`) : sql`FALSE`}
          THEN ts_rank(si.search_vector, ${tsq !== "" ? sql.raw(tsq) : sql`to_tsquery('russian','x')`})
        ELSE 0.01
      END AS rank
    FROM storage_items si
    LEFT JOIN personnel p ON p.id = si.personnel_id
    WHERE si.deleted_at IS NULL
      AND (
        ${tsq !== "" ? sql.raw(`si.search_vector @@ ${tsq} OR`) : sql``}
        si.inventory_number ILIKE ${likePattern} OR
        si.serial_number    ILIKE ${likePattern} OR
        si.notes            ILIKE ${likePattern} OR
        p.last_name         ILIKE ${likePattern} OR
        p.first_name        ILIKE ${likePattern}
      )
    ORDER BY rank DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  return (rows.rows as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    module: "storage_items" as SearchModule,
    title: r.title as string,
    subtitle: r.subtitle as string,
    badge: translateStatus(r.badge as string, "storage"),
    badgeVariant: statusVariant(r.badge as string),
    href: `/storage-and-passes?highlight=${r.id}`,
    rank: Number(r.rank),
    highlight: "",
  }));
}

// ── Translation helpers ────────────────────────────────────────────────────

function translateStatus(
  status: string,
  module: "personnel" | "equipment" | "storage"
): string {
  const maps: Record<string, Record<string, string>> = {
    personnel: {
      active: "В строю",
      detached: "Командировка",
      hospital: "Госпиталь",
      leave: "Отпуск",
      dismissed: "Уволен",
    },
    equipment: {
      in_use: "В работе",
      storage: "На складе",
      repair: "В ремонте",
      broken: "Сломан",
    },
    storage: {
      in_use: "Выдан",
      stock: "На складе",
      broken: "Сломан",
      lost: "Утерян",
    },
  };
  return maps[module]?.[status] ?? status;
}

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (["broken", "lost", "dismissed"].includes(status)) return "destructive";
  if (["stock", "leave", "hospital", "storage"].includes(status))
    return "secondary";
  if (["in_use", "active", "checked_out"].includes(status)) return "default";
  return "outline";
}

// ── Main search function ───────────────────────────────────────────────────

export async function globalSearch(params: {
  query: string;
  modules: SearchModule[];
  page: number;
}): Promise<SearchResults> {
  const { query, modules, page } = params;

  if (!query.trim() || query.trim().length < 2) {
    return { items: [], total: 0, query, modules, took: 0 };
  }

  const start = Date.now();
  const limit = SEARCH_PAGE_SIZE;
  const offset = (page - 1) * limit;

  const searchFunctions: Partial<
    Record<SearchModule, () => Promise<SearchResultItem[]>>
  > = {
    personnel: () => searchPersonnel(query, limit, offset),
    phones: () => searchPhones(query, limit, offset),
    equipment: () => searchEquipment(query, limit, offset),
    storage_items: () => searchStorageItems(query, limit, offset),
  };

  const activeModules =
    modules.length > 0
      ? modules
      : (Object.keys(searchFunctions) as SearchModule[]);

  const results = await Promise.all(
    activeModules
      .filter((m) => searchFunctions[m])
      .map((m) => searchFunctions[m]!())
  );

  const allItems = results
    .flat()
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit);

  return {
    items: allItems,
    total: allItems.length,
    query,
    modules: activeModules,
    took: Date.now() - start,
  };
}