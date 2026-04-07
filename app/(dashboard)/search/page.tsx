/**
 * /search — Global Search Page
 *
 * Architecture:
 *   - Server Component reads searchParams and fetches results directly
 *     (no API round-trip on initial render)
 *   - Client Component (SearchFilters) handles URL state via nuqs
 *   - Suspense boundary streams results while DB query runs
 *   - URL: /search?q=иванов&modules=personnel,equipment&page=1
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import { globalSearch } from "@/lib/search.server";
import { SEARCH_MODULES, type SearchModule } from "@/types/search";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchResultsList } from "@/components/search/SearchResultsList";
import { SearchResultsSkeleton } from "@/components/search/SearchResultsSkeleton";
import { SearchEmptyState } from "@/components/search/SearchEmptyState";

// ── Metadata ────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Поиск — ЗГТ",
  description: "Глобальный поиск по всей системе",
};

// ── Page props ───────────────────────────────────────────────────────────────
interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    modules?: string;
    page?: string;
  }>;
}

// ── Results Server Component (streamed via Suspense) ─────────────────────────
async function SearchResults({
  query,
  modules,
  page,
}: {
  query: string;
  modules: SearchModule[];
  page: number;
}) {
  if (!query || query.trim().length < 2) {
    return <SearchEmptyState state="idle" />;
  }

  const results = await globalSearch({ query, modules, page });

  if (results.items.length === 0) {
    return <SearchEmptyState state="no-results" query={query} />;
  }

  return <SearchResultsList results={results} />;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function SearchPage({ searchParams }: SearchPageProps) {
  // Next.js 15/16: searchParams is async
  const params = await searchParams;

  const query = params.q ?? "";
  const page = Math.max(1, Number(params.page ?? "1"));

  // Validate modules from URL
  const requestedModules: SearchModule[] = params.modules
    ? (params.modules
        .split(",")
        .filter((m): m is SearchModule =>
          SEARCH_MODULES.includes(m as SearchModule)
        ))
    : [];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">
          Глобальный поиск
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Поиск по личному составу, технике, носителям и пропускам
        </p>
      </div>

      {/* Search filters (Client Component — manages URL state) */}
      <SearchFilters
        initialQuery={query}
        initialModules={requestedModules}
        initialPage={page}
      />

      {/* Results — streamed via Suspense */}
      <div className="mt-6">
        <Suspense
          key={`${query}-${requestedModules.join(",")}-${page}`}
          fallback={<SearchResultsSkeleton />}
        >
          <SearchResults
            query={query}
            modules={requestedModules}
            page={page}
          />
        </Suspense>
      </div>
    </div>
  );
}
