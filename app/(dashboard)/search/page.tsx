/**
 * /search — Global Search Page — Aurora redesign
 * Replace: app/(dashboard)/search/page.tsx
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { globalSearch } from "@/lib/search.server";
import { SEARCH_MODULES, type SearchModule } from "@/types/search";
import { SearchFilters }        from "@/components/search/SearchFilters";
import { SearchResultsList }    from "@/components/search/SearchResultsList";
import { SearchResultsSkeleton, SearchEmptyState } from "@/components/search/SearchEmptyState";

export const metadata: Metadata = { title: "Поиск — ЗГТ" };

interface SearchPageProps {
  searchParams: Promise<{ q?: string; modules?: string; page?: string }>;
}

async function SearchResults({ query, modules, page }: { query:string; modules:SearchModule[]; page:number }) {
  if (!query || query.trim().length < 2) return <SearchEmptyState state="idle" />;
  const results = await globalSearch({ query, modules, page });
  if (!results.items.length) return <SearchEmptyState state="no-results" query={query} />;
  return <SearchResultsList results={results} />;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query  = params.q ?? "";
  const page   = Math.max(1, Number(params.page ?? "1"));
  const requestedModules: SearchModule[] = params.modules
    ? params.modules.split(",").filter((m): m is SearchModule => SEARCH_MODULES.includes(m as SearchModule))
    : [];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">

      {/* Page header */}
      <div className="flex items-center gap-3 animate-fade-up">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background:"rgba(59,130,246,0.1)", border:"1px solid rgba(59,130,246,0.2)" }}>
          <Search className="w-4 h-4" style={{ color:"#60A5FA" }} />
        </div>
        <div>
          <h1 className="text-[18px] font-bold" style={{ color:"#F0F4FF", letterSpacing:"-0.3px" }}>
            Глобальный поиск
          </h1>
          <p className="text-xs mt-0.5" style={{ color:"#4A5568" }}>
            Поиск по всем разделам системы
          </p>
        </div>
      </div>

      {/* Search area */}
      <div className="rounded-2xl p-5 animate-fade-up delay-1"
        style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }}>
        <SearchFilters initialQuery={query} initialModules={requestedModules} initialPage={page} />
      </div>

      {/* Results */}
      <Suspense key={`${query}-${requestedModules.join(",")}-${page}`} fallback={<SearchResultsSkeleton />}>
        <SearchResults query={query} modules={requestedModules} page={page} />
      </Suspense>
    </div>
  );
}