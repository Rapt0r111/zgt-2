/**
 * SearchResultsList — Aurora redesign
 * Replace: components/search/SearchResultsList.tsx
 */

import Link from "next/link";
import { Users, Smartphone, Monitor, Shield, Clock, ChevronRight } from "lucide-react";
import type { SearchResults, SearchResultItem, SearchModule } from "@/types/search";
import { MODULE_LABELS } from "@/types/search";
import { Route } from "next";

const MOD_CFG: Record<SearchModule, {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string; bg: string; border: string;
}> = {
  personnel:     { icon:Users,      color:"#34D399", bg:"rgba(52,211,153,0.08)",   border:"rgba(52,211,153,0.2)"   },
  phones:        { icon:Smartphone, color:"#A78BFA", bg:"rgba(167,139,250,0.08)", border:"rgba(167,139,250,0.2)" },
  equipment:     { icon:Monitor,    color:"#F59E0B", bg:"rgba(245,158,11,0.08)",  border:"rgba(245,158,11,0.2)"  },
  storage_items: { icon:Shield,     color:"#67E8F9", bg:"rgba(103,232,249,0.08)", border:"rgba(103,232,249,0.2)" },
};

function ResultItem({ item }: { item: SearchResultItem }) {
  const cfg = MOD_CFG[item.module];
  const Icon = cfg.icon;

  return (
    <Link href={item.href as Route}
      className="group flex items-center gap-3.5 rounded-xl focus:outline-none transition-all duration-150"
      style={{ padding:"12px 14px", border:"1px solid transparent" }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.background    = "rgba(255,255,255,0.03)";
        el.style.borderColor   = "rgba(255,255,255,0.06)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.background    = "transparent";
        el.style.borderColor   = "transparent";
      }}
    >
      {/* Module icon */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background:cfg.bg, border:`1px solid ${cfg.border}` }}>
        <Icon className="w-4 h-4" style={{ color:cfg.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate transition-colors"
          style={{ color:"#F0F4FF" }}>
          {item.title}
        </p>
        {item.subtitle && (
          <p className="text-xs leading-tight truncate mt-0.5" style={{ color:"#4A5568" }}>
            {item.subtitle}
          </p>
        )}
        {item.highlight && (
          <p className="mt-1.5 text-xs line-clamp-1" style={{ color:"#4A5568" }}
            dangerouslySetInnerHTML={{ __html:item.highlight }} />
        )}
      </div>

      {/* Badge */}
      {item.badge && (
        <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold shrink-0"
          style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>
          {item.badge}
        </span>
      )}

      <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-40 -translate-x-1 group-hover:translate-x-0 transition-all duration-150"
        style={{ color:cfg.color }} />
    </Link>
  );
}

function ResultsGroup({ module, items }: { module: SearchModule; items: SearchResultItem[] }) {
  const cfg = MOD_CFG[module];
  const Icon = cfg.icon;

  return (
    <section>
      <div className="flex items-center gap-2.5 mb-1 px-1">
        <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background:cfg.bg }}>
          <Icon className="w-3 h-3" style={{ color:cfg.color }} />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[1.2px]" style={{ color:`${cfg.color}80` }}>
          {MODULE_LABELS[module]}
        </span>
        <div className="flex-1 h-px" style={{ background:`linear-gradient(90deg,${cfg.color}15,transparent)` }} />
        <span className="text-[9px] tabular-nums" style={{ color:"#4A5568" }}>{items.length}</span>
      </div>
      <div>
        {items.map(item => <ResultItem key={item.id} item={item} />)}
      </div>
    </section>
  );
}

export function SearchResultsList({ results }: { results: SearchResults }) {
  const grouped = results.items.reduce<Partial<Record<SearchModule, SearchResultItem[]>>>(
    (acc, item) => { if (!acc[item.module]) acc[item.module] = []; acc[item.module]!.push(item); return acc; },
    {}
  );
  const hasGrouped = Object.keys(grouped).length > 1;

  return (
    <div className="animate-fade-up delay-2">
      {/* Meta */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-xs" style={{ color:"#4A5568" }}>
          Найдено:{" "}
          <span style={{ color:"rgba(240,244,255,0.7)", fontWeight:500 }}>{results.total}</span>
          {" "}
          {results.total === 1 ? "запись" : results.total < 5 ? "записи" : "записей"}
        </span>
        <div className="flex items-center gap-1" style={{ color:"#4A5568", fontSize:"11px" }}>
          <Clock className="w-3 h-3" />
          <span>{results.took} мс</span>
        </div>
      </div>

      {hasGrouped ? (
        <div className="space-y-6">
          {(Object.entries(grouped) as [SearchModule, SearchResultItem[]][]).map(([mod, items]) => (
            <ResultsGroup key={mod} module={mod} items={items} />
          ))}
        </div>
      ) : (
        <div>
          {results.items.map(item => <ResultItem key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}