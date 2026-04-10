/**
 * SearchEmptyState — shown when no query / no results
 * SearchResultsSkeleton — shown while Suspense is pending
 * 
 * Replace both: components/search/SearchEmptyState.tsx
 *              components/search/SearchResultsSkeleton.tsx
 */

import { Search, FileSearch } from "lucide-react";

// ── SearchEmptyState ─────────────────────────────────────────────────────────

type EmptyStateType = "idle" | "no-results";

interface SearchEmptyStateProps {
  state: EmptyStateType;
  query?: string;
}

export function SearchEmptyState({ state, query }: SearchEmptyStateProps) {
  if (state === "idle") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-up delay-2">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background:"rgba(59,130,246,0.08)", border:"1px solid rgba(59,130,246,0.15)" }}>
          <Search className="w-6 h-6" style={{ color:"rgba(96,165,250,0.6)" }} />
        </div>

        <p className="text-sm font-medium mb-1.5" style={{ color:"rgba(240,244,255,0.6)" }}>
          Начните вводить запрос
        </p>
        <p className="text-xs max-w-xs leading-relaxed" style={{ color:"rgba(148,163,184,0.4)" }}>
          Поиск по ФИО, личному номеру, инвентарному и серийному номеру, IMEI, должности
        </p>

        {/* Prefix hint chips */}
        <div className="flex items-center gap-2 mt-5 flex-wrap justify-center">
          {[
            { prefix:"@", label:"Личный состав", color:"#34D399" },
            { prefix:"#", label:"Техника",       color:"#F59E0B" },
            { prefix:"?", label:"Носители",      color:"#67E8F9" },
            { prefix:">", label:"Команды",       color:"#A78BFA" },
          ].map(h => (
            <span key={h.prefix}
              className="flex items-center gap-1.5 text-[11px] rounded-lg"
              style={{ padding:"5px 10px", background:`${h.color}08`, border:`1px solid ${h.color}15`, color:h.color, opacity:0.75 }}>
              <span className="font-mono font-bold">{h.prefix}</span>
              {h.label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-up">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" }}>
        <FileSearch className="w-6 h-6" style={{ color:"rgba(148,163,184,0.3)" }} />
      </div>

      <p className="text-sm font-medium mb-1" style={{ color:"rgba(240,244,255,0.6)" }}>
        Ничего не найдено
      </p>
      {query && (
        <p className="text-xs" style={{ color:"rgba(148,163,184,0.4)" }}>
          По запросу{" "}
          <span className="font-medium" style={{ color:"rgba(240,244,255,0.5)" }}>«{query}»</span>
        </p>
      )}
      <p className="text-xs mt-1" style={{ color:"rgba(148,163,184,0.3)" }}>
        Попробуйте другой запрос или снимите фильтры по разделам
      </p>
    </div>
  );
}

// ── SearchResultsSkeleton ────────────────────────────────────────────────────

export function SearchResultsSkeleton() {
  return (
    <div className="animate-pulse space-y-1">
      {/* Group header skeleton */}
      <div className="flex items-center gap-2.5 px-1 mb-3">
        <div className="w-5 h-5 rounded-md skeleton" />
        <div className="h-2.5 w-20 skeleton rounded" />
        <div className="flex-1 h-px skeleton" />
      </div>

      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3.5 rounded-xl"
          style={{ padding:"12px 14px", border:"1px solid rgba(255,255,255,0.03)" }}>
          <div className="w-9 h-9 rounded-xl skeleton shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 skeleton rounded w-2/5" />
            <div className="h-2.5 skeleton rounded w-1/4" />
          </div>
          <div className="h-5 skeleton rounded-full w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}