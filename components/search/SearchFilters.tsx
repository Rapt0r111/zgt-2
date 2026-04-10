"use client";

/**
 * SearchFilters — Aurora redesign
 * Replace: components/search/SearchFilters.tsx
 */

import {
  useQueryStates, parseAsString, parseAsArrayOf, parseAsStringEnum, parseAsInteger,
} from "nuqs";
import { useTransition, useCallback, useRef, useEffect, useState } from "react";
import { Search, X, Loader2, Users, Monitor, Smartphone, Shield } from "lucide-react";
import { SEARCH_MODULES, MODULE_LABELS, type SearchModule } from "@/types/search";

const T = {
  glass:      "rgba(255,255,255,0.04)",
  glassBorder:"rgba(255,255,255,0.08)",
  text1:      "#F0F4FF",
  text2:      "#94A3B8",
  text3:      "#4A5568",
  blue:       "#3B82F6",
  blue2:      "#60A5FA",
};

const MODULE_CFG: Record<SearchModule, { icon: React.ComponentType<{className?:string}>; color:string; bg:string; activeBg:string }> = {
  personnel:     { icon:Users,      color:"#34D399", bg:"rgba(52,211,153,0.06)",   activeBg:"rgba(52,211,153,0.14)"   },
  phones:        { icon:Smartphone, color:"#A78BFA", bg:"rgba(167,139,250,0.06)", activeBg:"rgba(167,139,250,0.14)" },
  equipment:     { icon:Monitor,    color:"#F59E0B", bg:"rgba(245,158,11,0.06)",  activeBg:"rgba(245,158,11,0.14)"  },
  storage_items: { icon:Shield,     color:"#67E8F9", bg:"rgba(103,232,249,0.06)", activeBg:"rgba(103,232,249,0.14)" },
};

interface SearchFiltersProps {
  initialQuery:   string;
  initialModules: SearchModule[];
  initialPage:    number;
}

export function SearchFilters({ initialQuery:_, initialModules:__, initialPage:___ }: SearchFiltersProps) {
  const [isPending, startTransition] = useTransition();
  const [focused,   setFocused]      = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [{ q, modules }, setParams] = useQueryStates(
    {
      q:       parseAsString.withDefault(""),
      modules: parseAsArrayOf(parseAsStringEnum([...SEARCH_MODULES])).withDefault([]),
      page:    parseAsInteger.withDefault(1),
    },
    { shallow:false, startTransition }
  );

  const [inputValue, setInputValue] = useState(q ?? "");
  useEffect(() => { setInputValue(q ?? ""); }, [q]);

  const handleChange = useCallback((val: string) => {
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setParams({ q:val, page:1 }), 350);
  }, [setParams]);

  const handleClear = useCallback(() => {
    setInputValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setParams({ q:"", page:1 });
  }, [setParams]);

  const toggleModule = useCallback((mod: SearchModule) => {
    const current = modules ?? [];
    const next = current.includes(mod) ? current.filter(m => m !== mod) : [...current, mod];
    setParams({ modules:next, page:1 });
  }, [modules, setParams]);

  const clearModules = useCallback(() => setParams({ modules:[], page:1 }), [setParams]);

  const activeModules = modules ?? [];

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative flex items-center gap-3 h-12 px-4 rounded-xl transition-all duration-200"
        style={{
          background: focused ? "rgba(255,255,255,0.05)" : T.glass,
          border: `1px solid ${focused ? "rgba(59,130,246,0.35)" : T.glassBorder}`,
          boxShadow: focused ? "0 0 0 3px rgba(59,130,246,0.08)" : "none",
        }}>

        {isPending
          ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" style={{ color:T.blue2 }} />
          : <Search className="w-4 h-4 shrink-0" style={{ color: focused ? T.blue2 : T.text3 }} />
        }

        <input
          type="search"
          value={inputValue}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Поиск по ФИО, инв. номеру, серийному номеру, IMEI..."
          autoFocus
          className="flex-1 bg-transparent focus:outline-none"
          style={{ fontSize:"14px", color:T.text1, caretColor:T.blue2 }}
        />

        {inputValue.length > 0 && (
          <button onClick={handleClear}
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all"
            style={{ background:T.glass, color:T.text3 }}>
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Module filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs shrink-0" style={{ color:T.text3 }}>Фильтр:</span>

        {SEARCH_MODULES.map(mod => {
          const isActive = activeModules.includes(mod);
          const cfg = MODULE_CFG[mod];
          const Icon = cfg.icon;
          return (
            <button key={mod} onClick={() => toggleModule(mod)}
              className="inline-flex items-center gap-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{
                padding:"6px 12px",
                background: isActive ? cfg.activeBg : cfg.bg,
                border: `1px solid ${isActive ? cfg.color+"30" : "rgba(255,255,255,0.06)"}`,
                color: isActive ? cfg.color : T.text3,
                boxShadow: isActive ? `0 0 12px ${cfg.color}15` : "none",
              }}>
              <Icon className="w-3 h-3" />
              {MODULE_LABELS[mod]}
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ background:cfg.color, boxShadow:`0 0 4px ${cfg.color}` }} />
              )}
            </button>
          );
        })}

        {activeModules.length > 0 && (
          <button onClick={clearModules} className="text-xs transition-colors"
            style={{ color:T.text3 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = T.text2; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = T.text3; }}>
            Сбросить
          </button>
        )}
      </div>

      {activeModules.length > 0 && (
        <p className="text-xs" style={{ color:T.text3 }}>
          Поиск в: {activeModules.map(m => MODULE_LABELS[m]).join(", ")}
        </p>
      )}
    </div>
  );
}