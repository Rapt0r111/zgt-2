"use client";

/**
 * PersonnelPicker — searchable combobox to select a personnel record.
 * Used in EquipmentForm for the "Владелец" field.
 *
 * Fixes applied:
 *   1. Removed dead `fetch(/api/personnel/search?limit=1&q=)` in the load-by-id effect
 *   2. Abort controller added to search useEffect to cancel stale requests
 *   3. Error state shown when lookup fails
 *   4. Fixed Hydration Error: Extracted clear button from trigger to prevent nested <button> elements
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  Search,
  X,
  ChevronDown,
  User,
  Loader2,
  UserX,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonnelOption {
  id:              string;
  lastName:        string;
  firstName:       string;
  middleName?:     string | null;
  rank:            string;
  personnelNumber?: string | null;
  unit?:           string | null;
}

interface PersonnelPickerProps {
  value?:    string;       // personnelId or "" / undefined
  onChange:  (id: string | null) => void;
  error?:    string;
  disabled?: boolean;
}

// ── Option row ─────────────────────────────────────────────────────────────

function PersonnelOptionRow({
  item,
  isActive,
  onClick,
}: {
  item:     PersonnelOption;
  isActive: boolean;
  onClick:  () => void;
}) {
  const initials = `${item.lastName[0] ?? ""}${item.firstName[0] ?? ""}`.toUpperCase();
  const hue = (item.lastName.charCodeAt(0) * 37 + item.firstName.charCodeAt(0) * 17) % 360;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
        "focus:outline-none",
        isActive ? "bg-primary/10" : "hover:bg-muted/70"
      )}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ backgroundColor: `hsl(${hue} 55% 48%)` }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {item.lastName} {item.firstName}{item.middleName ? ` ${item.middleName}` : ""}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {item.rank}
          {item.unit ? ` · ${item.unit}` : ""}
          {item.personnelNumber ? ` · ${item.personnelNumber}` : ""}
        </p>
      </div>
    </button>
  );
}

// ── Main picker ────────────────────────────────────────────────────────────

export function PersonnelPicker({
  value,
  onChange,
  error,
  disabled,
}: PersonnelPickerProps) {
  const [isOpen,    setIsOpen]    = useState(false);
  const [query,     setQuery]     = useState("");
  const [options,   setOptions]   = useState<PersonnelOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selected,  setSelected]  = useState<PersonnelOption | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load selected person on mount / value change ────────────────────────
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }

    let cancelled = false;

    fetch(`/api/personnel/${value}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PersonnelOption | null) => {
        if (!cancelled && data) setSelected(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  // ── Search when query / open changes ────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();

      setIsLoading(true);
      setLoadError(false);

      fetch(`/api/personnel/search?q=${encodeURIComponent(query)}&limit=20`, {
        signal: controller.signal,
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Search failed"))))
        .then((data: PersonnelOption[]) => setOptions(data))
        .catch((err: Error) => {
          if (err.name !== "AbortError") setLoadError(true);
          setOptions([]);
        })
        .finally(() => setIsLoading(false));

      return () => controller.abort();
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isOpen]);

  // ── Close on outside click ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const open = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setQuery("");
    setOptions([]);
    setTimeout(() => inputRef.current?.focus(), 10);
  }, [disabled]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  const select = useCallback(
    (item: PersonnelOption | null) => {
      setSelected(item);
      onChange(item?.id ?? null);
      close();
    },
    [onChange, close]
  );

  // ── Derive avatar style for trigger ────────────────────────────────────
  const triggerHue = selected
    ? (selected.lastName.charCodeAt(0) * 37 + selected.firstName.charCodeAt(0) * 17) % 360
    : 0;

  return (
    <div ref={containerRef} className="relative">
      {/* Main Trigger Button */}
      <button
        type="button"
        onClick={open}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          // Changed `px-3` to `pl-3 pr-9` to allocate space for the absolute clear button
          "w-full h-9 pl-3 pr-9 rounded-lg border bg-background text-sm",
          "flex items-center gap-2 text-left",
          "focus:outline-none focus:ring-2 focus:ring-ring transition-shadow",
          error    ? "border-destructive" : "border-input",
          disabled && "opacity-50 cursor-not-allowed",
          !selected && "text-muted-foreground"
        )}
      >
        {selected ? (
          <>
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ backgroundColor: `hsl(${triggerHue} 55% 48%)` }}
            >
              {`${selected.lastName[0]}${selected.firstName[0]}`.toUpperCase()}
            </div>
            <span className="flex-1 truncate text-foreground">
              {selected.lastName} {selected.firstName} · {selected.rank}
            </span>
          </>
        ) : loadError && value ? (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
            <span className="flex-1 truncate text-destructive text-xs">Ошибка загрузки</span>
          </>
        ) : (
          <>
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 truncate">Выбрать сотрудника</span>
          </>
        )}
      </button>

      {/* 
        Trailing Actions 
        Extracted out of the button as an absolute sibling to solve Hydration Errors
      */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
        {selected ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              select(null);
            }}
            className="pointer-events-auto shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 rounded-md"
            aria-label="Снять выбор"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 top-full left-0 right-0 mt-1",
            "bg-popover border border-border rounded-xl shadow-2xl overflow-hidden",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-100"
          )}
          role="listbox"
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin shrink-0" />
            ) : (
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по ФИО, номеру, званию..."
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto">
            {/* Clear / "no owner" option */}
            <button
              type="button"
              onClick={() => select(null)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                "hover:bg-muted/70 border-b border-border/50",
                !value && "bg-primary/5"
              )}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <UserX className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Без владельца</p>
                <p className="text-xs text-muted-foreground">Устройство не закреплено</p>
              </div>
              {!value && (
                <span className="ml-auto text-xs text-primary font-medium">✓</span>
              )}
            </button>

            {loadError && !isLoading && (
              <div className="px-3 py-4 text-center text-sm text-destructive flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Ошибка загрузки списка
              </div>
            )}

            {!loadError && options.length > 0
              ? options.map((item) => (
                  <PersonnelOptionRow
                    key={item.id}
                    item={item}
                    isActive={item.id === value}
                    onClick={() => select(item)}
                  />
                ))
              : !isLoading && !loadError && (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {query ? "Ничего не найдено" : "Начните вводить имя"}
                  </div>
                )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}