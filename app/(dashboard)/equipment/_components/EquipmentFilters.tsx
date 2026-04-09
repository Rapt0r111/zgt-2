"use client";

/**
 * EquipmentFilters — URL-synced search & filter bar (nuqs)
 */

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { parseAsString, parseAsInteger, useQueryStates } from "nuqs";
import { Search, X, Loader2, ChevronDown, SlidersHorizontal } from "lucide-react";
import { EQUIPMENT_STATUSES, DEVICE_TYPES } from "@/types/equipment";
import { cn } from "@/lib/utils";

interface EquipmentFiltersProps {
  locations: string[];
}

export function EquipmentFilters({ locations }: EquipmentFiltersProps) {
  const [isPending, startTransition] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [{ q, status, category, location, page }, setParams] = useQueryStates(
    {
      q:        parseAsString.withDefault(""),
      status:   parseAsString.withDefault(""),
      category: parseAsString.withDefault(""),
      location: parseAsString.withDefault(""),
      page:     parseAsInteger.withDefault(1),
    },
    { shallow: false, startTransition }
  );

  // Debounced search
  const [inputValue, setInputValue] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setInputValue(q); }, [q]);

  const handleSearchChange = useCallback((val: string) => {
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParams({ q: val.trim(), page: 1 });
    }, 350);
  }, [setParams]);

  const clearSearch = useCallback(() => {
    setInputValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setParams({ q: "", page: 1 });
  }, [setParams]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const hasFilters = Boolean(q || status || category || location);
  const hasAdvanced = Boolean(category || location);

  const chips: { label: string; onRemove: () => void }[] = [];
  if (q)        chips.push({ label: `Поиск: "${q}"`,  onRemove: () => { setInputValue(""); setParams({ q: "", page: 1 }); } });
  if (status)   chips.push({ label: EQUIPMENT_STATUSES.find((s) => s.value === status)?.label ?? status, onRemove: () => setParams({ status: "", page: 1 }) });
  if (category) chips.push({ label: DEVICE_TYPES.find((d) => d.value === category)?.label ?? category, onRemove: () => setParams({ category: "", page: 1 }) });
  if (location) chips.push({ label: `Место: ${location}`, onRemove: () => setParams({ location: "", page: 1 }) });

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden />
          <input
            type="search"
            value={inputValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Поиск по названию, инв. номеру, серийному номеру..."
            autoComplete="off"
            className={cn(
              "w-full h-9 pl-9 pr-8 rounded-lg border border-input bg-background",
              "text-sm placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
            )}
          />
          {isPending && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />}
          {!isPending && inputValue && (
            <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setParams({ status: e.target.value, page: 1 })}
            className={cn(
              "h-9 pl-3 pr-8 rounded-lg border border-input bg-background text-sm appearance-none cursor-pointer",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              status ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <option value="">Все статусы</option>
            {EQUIPMENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className={cn(
            "h-9 px-3 rounded-lg border text-sm flex items-center gap-2 transition-colors",
            showAdvanced || hasAdvanced
              ? "border-primary/50 bg-primary/5 text-primary"
              : "border-input text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Фильтры</span>
          {hasAdvanced && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </button>

        {hasFilters && (
          <button
            onClick={() => { setInputValue(""); setParams({ q: "", status: "", category: "", location: "", page: 1 }); }}
            className="h-9 px-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted border border-input transition-colors"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="flex flex-wrap gap-4 p-4 rounded-xl border border-border bg-muted/30">
          {/* Device type */}
          <div className="relative">
            <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Тип устройства</label>
            <select
              value={category}
              onChange={(e) => setParams({ category: e.target.value, page: 1 })}
              className="h-9 pl-3 pr-8 rounded-lg border border-input bg-background text-sm appearance-none cursor-pointer min-w-[140px] focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Все типы</option>
              {DEVICE_TYPES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 bottom-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Location */}
          {locations.length > 0 && (
            <div className="relative">
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Местоположение</label>
              <select
                value={location}
                onChange={(e) => setParams({ location: e.target.value, page: 1 })}
                className="h-9 pl-3 pr-8 rounded-lg border border-input bg-background text-sm appearance-none cursor-pointer min-w-[180px] focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Все места</option>
                {locations.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 bottom-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          )}
        </div>
      )}

      {/* Active chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span key={chip.label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              {chip.label}
              <button onClick={chip.onRemove} className="hover:text-primary/60 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}