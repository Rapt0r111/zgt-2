"use client";

/**
 * SearchFilters — Client Component
 *
 * Manages the search input and module filter toggles.
 * All state is encoded in the URL via nuqs — so:
 *   - Filters survive page reload
 *   - Links can be shared/bookmarked
 *   - Browser back/forward works correctly
 */

import { useQueryStates, parseAsString, parseAsArrayOf, parseAsStringEnum, parseAsInteger } from "nuqs";
import { useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { SEARCH_MODULES, MODULE_LABELS, type SearchModule } from "@/types/search";
import { cn } from "@/lib/utils";

interface SearchFiltersProps {
  initialQuery: string;
  initialModules: SearchModule[];
  initialPage: number;
}

export function SearchFilters({
  initialQuery,
  initialModules,
  initialPage,
}: SearchFiltersProps) {
  const [isPending, startTransition] = useTransition();

  // nuqs manages URL search params
  const [{ q, modules, page }, setParams] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
      modules: parseAsArrayOf(
        parseAsStringEnum([...SEARCH_MODULES])
      ).withDefault([]),
      page: parseAsInteger.withDefault(1),
    },
    {
      // Shallow routing — updates URL without full navigation
      shallow: false,
      startTransition,
    }
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setParams({ q: value, page: 1 });
    },
    [setParams]
  );

  const handleClearQuery = useCallback(() => {
    setParams({ q: "", page: 1 });
  }, [setParams]);

  const toggleModule = useCallback(
    (module: SearchModule) => {
      const current = modules ?? [];
      const next = current.includes(module)
        ? current.filter((m) => m !== module)
        : [...current, module];
      setParams({ modules: next, page: 1 });
    },
    [modules, setParams]
  );

  const clearAllFilters = useCallback(() => {
    setParams({ modules: [], page: 1 });
  }, [setParams]);

  const hasActiveModuleFilters = (modules ?? []).length > 0;

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={q ?? ""}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Поиск по ФИО, номеру, модели, инвентарному номеру..."
          className={cn(
            "w-full rounded-lg border border-input bg-background",
            "pl-10 pr-10 py-3 text-sm",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
            "transition-shadow"
          )}
          autoFocus
          aria-label="Строка поиска"
        />

        {/* Clear button */}
        {(q ?? "").length > 0 && (
          <button
            onClick={handleClearQuery}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Очистить поиск"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Module filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground shrink-0">
          Фильтр по разделу:
        </span>

        {SEARCH_MODULES.map((module) => {
          const isActive = (modules ?? []).includes(module);
          return (
            <button
              key={module}
              onClick={() => toggleModule(module)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full",
                "text-xs font-medium border transition-all",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted"
              )}
              aria-pressed={isActive}
            >
              {MODULE_LABELS[module]}
            </button>
          );
        })}

        {hasActiveModuleFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Сбросить фильтры
          </button>
        )}
      </div>

      {/* Active filters summary */}
      {hasActiveModuleFilters && (
        <p className="text-xs text-muted-foreground">
          Поиск в:{" "}
          {(modules ?? [])
            .map((m) => MODULE_LABELS[m])
            .join(", ")}
        </p>
      )}
    </div>
  );
}