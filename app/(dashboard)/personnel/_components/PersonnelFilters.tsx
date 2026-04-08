"use client";

/**
 * PersonnelFilters — URL-synced search & filter bar
 * Search input is debounced (350ms) to avoid server requests on every keystroke.
 * All other filters (status, unit) sync immediately.
 */

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  parseAsString,
  parseAsStringEnum,
  parseAsInteger,
  useQueryStates,
} from "nuqs";
import { Search, X, Loader2, ChevronDown, SlidersHorizontal } from "lucide-react";
import { PERSONNEL_STATUSES, MILITARY_RANKS } from "@/types/personnel";
import type { PersonnelStatus } from "@/types/personnel";
import { cn } from "@/lib/utils";

interface PersonnelFiltersProps {
  units: string[];
}

const STATUS_VALUES = PERSONNEL_STATUSES.map((s) => s.value) as [
  PersonnelStatus,
  ...PersonnelStatus[]
];

export function PersonnelFilters({ units }: PersonnelFiltersProps) {
  const [isPending, startTransition] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [{ q, status, unit, rank, page }, setParams] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
      status: parseAsStringEnum([...STATUS_VALUES, ""] as const).withDefault(""),
      unit: parseAsString.withDefault(""),
      rank: parseAsString.withDefault(""),
      page: parseAsInteger.withDefault(1),
    },
    { shallow: false, startTransition }
  );

  // ── Debounced search ────────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local input in sync when URL changes externally (e.g. browser back)
  useEffect(() => {
    setInputValue(q);
  }, [q]);

  const handleSearchChange = useCallback(
    (val: string) => {
      setInputValue(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setParams({ q: val.trim(), page: 1 });
      }, 350);
    },
    [setParams]
  );

  const clearSearch = useCallback(() => {
    setInputValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setParams({ q: "", page: 1 });
  }, [setParams]);

  // Cleanup debounce on unmount
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  // ── Other filters ────────────────────────────────────────────────────────
  const setStatus = useCallback(
    (val: PersonnelStatus | "") => setParams({ status: val, page: 1 }),
    [setParams]
  );
  const setUnit = useCallback(
    (val: string) => setParams({ unit: val, page: 1 }),
    [setParams]
  );
  const setRank = useCallback(
    (val: string) => setParams({ rank: val, page: 1 }),
    [setParams]
  );

  const clearAll = useCallback(
    () => {
      setInputValue("");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setParams({ q: "", status: "", unit: "", rank: "", page: 1 });
    },
    [setParams]
  );

  const hasFilters = Boolean(q || status || unit || rank);
  const hasAdvancedFilters = Boolean(unit || rank);

  return (
    <div className="space-y-3">
      {/* ── Main row ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            value={inputValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Поиск по ФИО, личному номеру, должности..."
            autoComplete="off"
            className={cn(
              "w-full h-9 pl-9 pr-8 rounded-lg border border-input bg-background",
              "text-sm placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
              "transition-shadow"
            )}
            aria-label="Поиск по личному составу"
          />
          {isPending && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
          )}
          {!isPending && inputValue && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className={cn(
            "h-9 px-3 rounded-lg border text-sm flex items-center gap-2 transition-colors",
            showAdvanced || hasAdvancedFilters
              ? "border-primary/50 bg-primary/5 text-primary"
              : "border-input text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          aria-expanded={showAdvanced}
          aria-label="Расширенные фильтры"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Фильтры</span>
          {hasAdvancedFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </button>

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

      {/* ── Advanced filters ──────────────────────────────────────────────── */}
      {showAdvanced && (
        <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-border bg-muted/30">
          {/* Unit filter */}
          {units.length > 0 && (
            <div className="relative">
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium">
                Подразделение
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={cn(
                  "h-9 pl-3 pr-8 rounded-lg border border-input bg-background",
                  "text-sm appearance-none cursor-pointer min-w-[160px]",
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
              <ChevronDown className="absolute right-2.5 bottom-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          )}

          {/* Rank filter */}
          <div className="relative">
            <label className="block text-xs text-muted-foreground mb-1.5 font-medium">
              Звание
            </label>
            <select
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              className={cn(
                "h-9 pl-3 pr-8 rounded-lg border border-input bg-background",
                "text-sm appearance-none cursor-pointer min-w-[180px]",
                "focus:outline-none focus:ring-2 focus:ring-ring",
                rank ? "text-foreground" : "text-muted-foreground"
              )}
              aria-label="Фильтр по званию"
            >
              <option value="">Все звания</option>
              {MILITARY_RANKS.map((r) => (
                <option key={r.label} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 bottom-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      )}

      {/* ── Active filter chips ───────────────────────────────────────────── */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {q && (
            <FilterChip
              label={`Поиск: "${q}"`}
              onRemove={() => { setInputValue(""); setParams({ q: "", page: 1 }); }}
            />
          )}
          {status && (
            <FilterChip
              label={PERSONNEL_STATUSES.find((s) => s.value === status)?.label ?? status}
              onRemove={() => setStatus("")}
            />
          )}
          {unit && (
            <FilterChip label={`Взвод: ${unit}`} onRemove={() => setUnit("")} />
          )}
          {rank && (
            <FilterChip label={rank} onRemove={() => setRank("")} />
          )}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
      "text-xs font-medium bg-primary/10 text-primary border border-primary/20"
    )}>
      {label}
      <button
        onClick={onRemove}
        className="hover:text-primary/60 transition-colors"
        aria-label={`Убрать фильтр: ${label}`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}