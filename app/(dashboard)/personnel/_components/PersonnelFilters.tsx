"use client";

/**
 * PersonnelFilters — URL-synced search & filter bar
 * Uses nuqs for search params state management.
 */

import { useCallback, useTransition } from "react";
import {
  parseAsString,
  parseAsStringEnum,
  parseAsInteger,
  useQueryStates,
} from "nuqs";
import { Search, X, Loader2, ChevronDown } from "lucide-react";
import { PERSONNEL_STATUSES, PERSONNEL_STATUSES as PS } from "@/types/personnel";
import type { PersonnelStatus } from "@/types/personnel";
import { cn } from "@/lib/utils";

interface PersonnelFiltersProps {
  units: string[];
}

const STATUS_VALUES = PS.map((s) => s.value) as [PersonnelStatus, ...PersonnelStatus[]];

export function PersonnelFilters({ units }: PersonnelFiltersProps) {
  const [isPending, startTransition] = useTransition();

  const [{ q, status, unit, page }, setParams] = useQueryStates(
    {
      q:      parseAsString.withDefault(""),
      status: parseAsStringEnum([...STATUS_VALUES, ""] as const).withDefault(""),
      unit:   parseAsString.withDefault(""),
      page:   parseAsInteger.withDefault(1),
    },
    { shallow: false, startTransition }
  );

  const setSearch = useCallback(
    (val: string) => setParams({ q: val, page: 1 }),
    [setParams]
  );

  const setStatus = useCallback(
    (val: PersonnelStatus | "") => setParams({ status: val, page: 1 }),
    [setParams]
  );

  const setUnit = useCallback(
    (val: string) => setParams({ unit: val, page: 1 }),
    [setParams]
  );

  const clearAll = useCallback(
    () => setParams({ q: "", status: "", unit: "", page: 1 }),
    [setParams]
  );

  const hasFilters = Boolean(q || status || unit);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search input */}
      <div className="relative flex-1 min-w-0">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
          aria-hidden
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по ФИО, номеру, должности..."
          autoComplete="off"
          className={cn(
            "w-full h-9 pl-9 pr-8 rounded-lg border border-input bg-background",
            "text-sm placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
            "transition-shadow"
          )}
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
        )}
        {!isPending && q && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Очистить поиск"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Status filter */}
      <div className="relative">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as PersonnelStatus | "")}
          className={cn(
            "h-9 pl-3 pr-8 rounded-lg border border-input bg-background",
            "text-sm appearance-none cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-ring",
            "transition-colors",
            status ? "text-foreground" : "text-muted-foreground"
          )}
          aria-label="Фильтр по статусу"
        >
          <option value="">Все статусы</option>
          {PERSONNEL_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      </div>

      {/* Unit filter */}
      {units.length > 0 && (
        <div className="relative">
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className={cn(
              "h-9 pl-3 pr-8 rounded-lg border border-input bg-background",
              "text-sm appearance-none cursor-pointer",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              unit ? "text-foreground" : "text-muted-foreground"
            )}
            aria-label="Фильтр по взводу"
          >
            <option value="">Все взводы</option>
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
      )}

      {/* Clear all */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className={cn(
            "h-9 px-3 rounded-lg text-sm text-muted-foreground",
            "hover:text-foreground hover:bg-muted border border-input",
            "transition-colors whitespace-nowrap"
          )}
        >
          Сбросить
        </button>
      )}
    </div>
  );
}