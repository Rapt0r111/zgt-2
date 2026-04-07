/**
 * Global Search — Server Query
 *
 * Uses PostgreSQL full-text search (tsvector/tsquery) with ts_rank ranking
 * and ts_headline for highlighted snippets.
 *
 * Each module runs an independent ranked query; results are merged and
 * re-sorted by rank so the most relevant item wins regardless of module.
 *
 * "server-only" prevents this from being imported in Client Components.
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

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Converts a plain query string into a PostgreSQL tsquery.
 * Supports:
 *   - multi-word: "иванов петр" → 'иванов' & 'петр'
 *   - prefix search: appends :* to each term for partial matches
 */
function toTsQuery(query: string): string {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/'/g, "''")) // escape single quotes
    .map((t) => `${t}:*`);             // prefix matching

  return terms.join(" & ");
}

// ── Per-module search queries ──────────────────────────────────────────────

async function searchPersonnel(
  tsQuery: string,
  rawQuery: string,
  limit: number,
  offset: number
): Promise<SearchResultItem[]> {
  const rows = await db.execute(sql`
    SELECT
      p.id,
      p.last_name || ' ' || p.first_name ||
        COALESCE(' ' || p.middle_name, '') AS title,
      COALESCE(p.rank, '') || COALESCE(', ' || p.position, '') AS subtitle,
      p.status AS badge,
      ts_rank(p.search_vector, query) AS rank,
      ts_headline(
        'zgt_search',
        p.last_name || ' ' || p.first_name || ' ' ||
          COALESCE(p.personnel_number, '') || ' ' ||
          COALESCE(p.unit, ''),
        query,
        'StartSel=<mark>, StopSel=</mark>, MaxWords=10, MinWords=3'
      ) AS highlight
    FROM personnel p,
         to_tsquery('zgt_search', ${tsQuery}) query
    WHERE p.deleted_at IS NULL
      AND p.search_vector @@ query
    ORDER BY rank DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  return (rows.rows as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    module: "personnel" as SearchModule,
    title: r.title as string,
    subtitle: r.subtitle as string,
    badge: translateStatus(r.badge as string, "personnel"),
    badgeVariant: statusVariant(r.badge as string),
    href: `/personnel?highlight=${r.id}`,
    rank: Number(r.rank),
    highlight: r.highlight as string,
  }));
}

async function searchPhones(
  tsQuery: string,
  rawQuery: string,
  limit: number,
  offset: number
): Promise<SearchResultItem[]> {
  const rows = await db.execute(sql`
    SELECT
      ph.id,
      COALESCE(ph.brand, '') || ' ' || ph.model AS title,
      p.last_name || ' ' || p.first_name AS subtitle,
      ph.status AS badge,
      ts_rank(ph.search_vector, query) AS rank,
      ts_headline(
        'zgt_search',
        COALESCE(ph.brand, '') || ' ' || ph.model || ' ' ||
          COALESCE(ph.imei1, '') || ' ' || COALESCE(ph.serial_number, ''),
        query,
        'StartSel=<mark>, StopSel=</mark>, MaxWords=10, MinWords=3'
      ) AS highlight
    FROM phones ph
    JOIN personnel p ON p.id = ph.personnel_id,
         to_tsquery('zgt_search', ${tsQuery}) query
    WHERE ph.deleted_at IS NULL
      AND ph.search_vector @@ query
    ORDER BY rank DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  return (rows.rows as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    module: "phones" as SearchModule,
    title: r.title as string,
    subtitle: r.subtitle as string,
    badge: r.badge === "checked_in" ? "Сдан" : "Выдан",
    badgeVariant: r.badge === "checked_in" ? "secondary" : "default",
    href: `/phones?highlight=${r.id}`,
    rank: Number(r.rank),
    highlight: r.highlight as string,
  }));
}

async function searchEquipment(
  tsQuery: string,
  rawQuery: string,
  limit: number,
  offset: number
): Promise<SearchResultItem[]> {
  const rows = await db.execute(sql`
    SELECT
      e.id,
      e.display_name AS title,
      COALESCE(e.inventory_number, 'Без инв. номера') || 
        COALESCE(' · ' || e.location, '') AS subtitle,
      e.status AS badge,
      ts_rank(e.search_vector, query) AS rank,
      ts_headline(
        'zgt_search',
        e.display_name || ' ' ||
          COALESCE(e.inventory_number, '') || ' ' ||
          COALESCE(e.serial_number, '') || ' ' ||
          COALESCE(e.location, ''),
        query,
        'StartSel=<mark>, StopSel=</mark>, MaxWords=10, MinWords=3'
      ) AS highlight
    FROM equipment e,
         to_tsquery('zgt_search', ${tsQuery}) query
    WHERE e.deleted_at IS NULL
      AND e.search_vector @@ query
    ORDER BY rank DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  return (rows.rows as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    module: "equipment" as SearchModule,
    title: r.title as string,
    subtitle: r.subtitle as string,
    badge: translateStatus(r.badge as string, "equipment"),
    badgeVariant: statusVariant(r.badge as string),
    href: `/equipment?highlight=${r.id}`,
    rank: Number(r.rank),
    highlight: r.highlight as string,
  }));
}

async function searchStorageItems(
  tsQuery: string,
  rawQuery: string,
  limit: number,
  offset: number
): Promise<SearchResultItem[]> {
  const rows = await db.execute(sql`
    SELECT
      si.id,
      CASE si.type
        WHEN 'flash_drive' THEN 'Флешка МО'
        ELSE 'Эл. пропуск'
      END || ' · ' || COALESCE(si.inventory_number, si.serial_number, si.id::text) AS title,
      COALESCE(
        p.last_name || ' ' || p.first_name,
        'Не выдан'
      ) AS subtitle,
      si.status AS badge,
      ts_rank(si.search_vector, query) AS rank,
      ts_headline(
        'zgt_search',
        COALESCE(si.inventory_number, '') || ' ' ||
          COALESCE(si.serial_number, '') || ' ' ||
          COALESCE(si.notes, ''),
        query,
        'StartSel=<mark>, StopSel=</mark>, MaxWords=10, MinWords=3'
      ) AS highlight
    FROM storage_items si
    LEFT JOIN personnel p ON p.id = si.personnel_id,
         to_tsquery('zgt_search', ${tsQuery}) query
    WHERE si.deleted_at IS NULL
      AND si.search_vector @@ query
    ORDER BY rank DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  return (rows.rows as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    module: "storage_items" as SearchModule,
    title: r.title as string,
    subtitle: r.subtitle as string,
    badge: translateStatus(r.badge as string, "storage"),
    badgeVariant: statusVariant(r.badge as string),
    href: `/storage-and-passes?highlight=${r.id}`,
    rank: Number(r.rank),
    highlight: r.highlight as string,
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
  if (["stock", "leave", "hospital"].includes(status)) return "secondary";
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
  const tsQuery = toTsQuery(query);
  const limit = SEARCH_PAGE_SIZE;
  const offset = (page - 1) * limit;

  // Run all module queries in parallel — no waterfall!
  const searchFunctions: Partial<
    Record<SearchModule, () => Promise<SearchResultItem[]>>
  > = {
    personnel: () => searchPersonnel(tsQuery, query, limit, offset),
    phones: () => searchPhones(tsQuery, query, limit, offset),
    equipment: () => searchEquipment(tsQuery, query, limit, offset),
    storage_items: () => searchStorageItems(tsQuery, query, limit, offset),
  };

  const activeModules = modules.length > 0
    ? modules
    : (Object.keys(searchFunctions) as SearchModule[]);

  const results = await Promise.all(
    activeModules
      .filter((m) => searchFunctions[m])
      .map((m) => searchFunctions[m]!())
  );

  // Flatten and re-sort by rank across all modules
  const allItems = results
    .flat()
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit);

  return {
    items: allItems,
    total: allItems.length, // TODO: add COUNT queries for pagination
    query,
    modules: activeModules,
    took: Date.now() - start,
  };
}