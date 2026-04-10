"use client";

/**
 * EquipmentFilters — Aurora glass style (URL-synced via nuqs)
 */

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { parseAsString, parseAsInteger, useQueryStates } from "nuqs";
import { Search, X, Loader2, ChevronDown, SlidersHorizontal } from "lucide-react";
import { EQUIPMENT_STATUSES, DEVICE_TYPES } from "@/types/equipment";
import { cn } from "@/lib/utils";

const inputBase: React.CSSProperties = {
  background: "hsl(220 38% 10%)",
  border: "1px solid hsl(220 30% 14%)",
  color: "hsl(220 50% 92%)",
  borderRadius: "10px",
  fontSize: "13px",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const inputFocus: React.CSSProperties = {
  borderColor: "hsl(217 91% 60% / 0.45)",
  boxShadow: "0 0 0 3px hsl(217 91% 60% / 0.1)",
  outline: "none",
};

interface EquipmentFiltersProps {
  locations: string[];
}

export function EquipmentFilters({ locations }: EquipmentFiltersProps) {
  const [isPending, startTransition] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [{ q, status, category, location }, setParams] = useQueryStates(
    {
      q:        parseAsString.withDefault(""),
      status:   parseAsString.withDefault(""),
      category: parseAsString.withDefault(""),
      location: parseAsString.withDefault(""),
      page:     parseAsInteger.withDefault(1),
    },
    { shallow: false, startTransition }
  );

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

  const hasFilters  = Boolean(q || status || category || location);
  const hasAdvanced = Boolean(category || location);

  const chips: { label: string; onRemove: () => void }[] = [];
  if (q)        chips.push({ label: `Поиск: "${q}"`, onRemove: () => { setInputValue(""); setParams({ q: "", page: 1 }); } });
  if (status)   chips.push({ label: EQUIPMENT_STATUSES.find((s) => s.value === status)?.label ?? status, onRemove: () => setParams({ status: "", page: 1 }) });
  if (category) chips.push({ label: DEVICE_TYPES.find((d) => d.value === category)?.label ?? category, onRemove: () => setParams({ category: "", page: 1 }) });
  if (location) chips.push({ label: `Место: ${location}`, onRemove: () => setParams({ location: "", page: 1 }) });

  const selectStyle: React.CSSProperties = {
    ...inputBase,
    appearance: "none",
    cursor: "pointer",
    padding: "0 2rem 0 0.75rem",
    height: "36px",
    color: status ? "hsl(220 50% 92%)" : "hsl(215 16% 40%)",
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "hsl(215 16% 40%)" }}
          />
          <input
            type="search"
            value={inputValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Поиск по названию, инв. номеру, серийному номеру..."
            autoComplete="off"
            className="w-full h-9 pl-9 pr-8"
            style={{ ...inputBase }}
            onFocus={(e) => Object.assign(e.target.style, inputFocus)}
            onBlur={(e) => {
              e.target.style.borderColor = "hsl(220 30% 14%)";
              e.target.style.boxShadow = "none";
              e.target.style.outline = "none";
            }}
          />
          {isPending && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin"
              style={{ color: "hsl(215 16% 40%)" }}
            />
          )}
          {!isPending && inputValue && (
            <button onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: "hsl(215 16% 40%)" }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status select */}
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setParams({ status: e.target.value, page: 1 })}
            style={selectStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocus)}
            onBlur={(e) => {
              e.target.style.borderColor = "hsl(220 30% 14%)";
              e.target.style.boxShadow = "none";
            }}
          >
            <option value="">Все статусы</option>
            {EQUIPMENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "hsl(215 16% 40%)" }}
          />
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="h-9 px-3 rounded-[10px] text-xs flex items-center gap-2 transition-all"
          style={{
            ...inputBase,
            color: showAdvanced || hasAdvanced ? "hsl(213 100% 68%)" : "hsl(215 16% 46%)",
            borderColor: showAdvanced || hasAdvanced
              ? "hsl(217 91% 60% / 0.4)"
              : "hsl(220 30% 14%)",
            background: showAdvanced || hasAdvanced
              ? "hsl(217 91% 60% / 0.08)"
              : "hsl(220 38% 10%)",
          }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Фильтры</span>
          {hasAdvanced && (
            <span className="w-1.5 h-1.5 rounded-full"
              style={{ background: "hsl(213 100% 68%)" }}
            />
          )}
        </button>

        {/* Reset */}
        {hasFilters && (
          <button
            onClick={() => {
              setInputValue("");
              setParams({ q: "", status: "", category: "", location: "", page: 1 });
            }}
            className="h-9 px-3 text-xs transition-all"
            style={{
              ...inputBase,
              color: "hsl(215 16% 46%)",
            }}
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div
          className="flex flex-wrap gap-4 p-4 rounded-xl"
          style={{ background: "hsl(220 38% 10%)", border: "1px solid hsl(220 30% 14%)" }}
        >
          <div className="relative">
            <label className="block text-[11px] font-medium mb-1.5"
              style={{ color: "hsl(215 16% 40%)" }}
            >
              Тип устройства
            </label>
            <select
              value={category}
              onChange={(e) => setParams({ category: e.target.value, page: 1 })}
              style={{ ...selectStyle, minWidth: "140px" }}
            >
              <option value="">Все типы</option>
              {DEVICE_TYPES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 bottom-2.5 w-3.5 h-3.5 pointer-events-none"
              style={{ color: "hsl(215 16% 40%)" }}
            />
          </div>

          {locations.length > 0 && (
            <div className="relative">
              <label className="block text-[11px] font-medium mb-1.5"
                style={{ color: "hsl(215 16% 40%)" }}
              >
                Местоположение
              </label>
              <select
                value={location}
                onChange={(e) => setParams({ location: e.target.value, page: 1 })}
                style={{ ...selectStyle, minWidth: "180px" }}
              >
                <option value="">Все места</option>
                {locations.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 bottom-2.5 w-3.5 h-3.5 pointer-events-none"
                style={{ color: "hsl(215 16% 40%)" }}
              />
            </div>
          )}
        </div>
      )}

      {/* Active chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                background: "hsl(217 91% 60% / 0.12)",
                color: "hsl(213 100% 72%)",
                border: "1px solid hsl(217 91% 60% / 0.25)",
              }}
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="transition-opacity hover:opacity-60"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}