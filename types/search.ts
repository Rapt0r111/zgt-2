/**
 * Global Search — Shared Types
 *
 * These types are safe to import in both Server and Client components.
 * No server-only imports here.
 */

// ── Search modules ─────────────────────────────────────────────────────────

export const SEARCH_MODULES = [
  "personnel",
  "phones",
  "equipment",
  "storage_items",
] as const;

export type SearchModule = (typeof SEARCH_MODULES)[number];

export const MODULE_LABELS: Record<SearchModule, string> = {
  personnel: "Личный состав",
  phones: "Телефоны",
  equipment: "Техника",
  storage_items: "Носители и пропуска",
};

export const MODULE_ICONS: Record<SearchModule, string> = {
  personnel: "Users",
  phones: "Smartphone",
  equipment: "Monitor",
  storage_items: "Shield",
};

export const MODULE_ROUTES: Record<SearchModule, string> = {
  personnel: "/personnel",
  phones: "/phones",
  equipment: "/equipment",
  storage_items: "/storage-and-passes",
};

// ── Result types ───────────────────────────────────────────────────────────

export interface SearchResultItem {
  id: string;
  module: SearchModule;
  title: string;
  subtitle: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  href: string;
  rank: number;       // PostgreSQL ts_rank score
  highlight?: string; // ts_headline snippet
}

export interface SearchResults {
  items: SearchResultItem[];
  total: number;
  query: string;
  modules: SearchModule[];
  took: number; // ms
}

// ── URL search params schema ───────────────────────────────────────────────
// Managed by nuqs — persisted in URL as ?q=...&modules=...&page=...

export interface SearchParams {
  q: string;
  modules: SearchModule[];
  page: number;
}

export const SEARCH_PAGE_SIZE = 20;