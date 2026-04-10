"use client";

/**
 * CommandPalette v4 — Aurora Command
 * Fully redesigned to match Aurora design system tokens.
 * 
 * Prefix routing:
 *   @query → Personnel  | #query → Equipment
 *   ?query → Storage    | >query → Commands
 */

import {
  useEffect, useRef, useState, useCallback, useMemo, type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Search, Loader2, Users, Smartphone, Monitor, Shield,
  ArrowRight, Clock, ChevronRight, Zap, LayoutDashboard,
  UserCog, X, Plus, AlertCircle,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import type { SearchResults, SearchResultItem, SearchModule } from "@/types/search";
import { MODULE_LABELS } from "@/types/search";

// ── Design tokens (match CSS vars) ─────────────────────────────────────────

const T = {
  bg0: "#060C18",
  bg1: "#0B1426",
  bg2: "#111D35",
  blue: "#3B82F6",
  blue2: "#60A5FA",
  violet: "#8B5CF6",
  emerald: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  cyan: "#06B6D4",
  text1: "#F0F4FF",
  text2: "#94A3B8",
  text3: "#4A5568",
  glass: "rgba(255,255,255,0.04)",
  glassBorder: "rgba(255,255,255,0.08)",
} as const;

// ── Constants ───────────────────────────────────────────────────────────────

const RECENT_KEY = "__zgt_cp_v4";
const MAX_RECENT = 5;
const DEBOUNCE_MS = 200;
const MAX_RESULTS = 14;

// ── Types ───────────────────────────────────────────────────────────────────

type PaletteMode = "all" | "personnel" | "equipment" | "phones" | "storage" | "commands";

interface NavCommand {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  href?: string;
  action?: () => void;
  shortcut?: string[];
  section: "nav" | "create";
  color: string;
}

// ── Command registry ────────────────────────────────────────────────────────

const NAV_COMMANDS: NavCommand[] = [
  { id: "nav-home", label: "Дашборд", icon: LayoutDashboard, href: "/", shortcut: ["G", "H"], section: "nav", color: T.blue2 },
  { id: "nav-personnel", label: "Личный состав", icon: Users, href: "/personnel", shortcut: ["G", "P"], section: "nav", color: "#34D399" },
  { id: "nav-phones", label: "Телефоны", icon: Smartphone, href: "/phones", shortcut: ["G", "T"], section: "nav", color: "#A78BFA" },
  { id: "nav-equipment", label: "Вычислительная техника", icon: Monitor, href: "/equipment", shortcut: ["G", "E"], section: "nav", color: T.amber },
  { id: "nav-storage", label: "Носители и пропуска", icon: Shield, href: "/storage-and-passes", shortcut: ["G", "N"], section: "nav", color: "#67E8F9" },
  { id: "nav-users", label: "Пользователи системы", icon: UserCog, href: "/users", section: "nav", color: "#F472B6" },
];

const CREATE_COMMANDS: NavCommand[] = [
  { id: "create-personnel", label: "Добавить сотрудника", description: "Открыть форму нового сотрудника", icon: Users, action: () => window.dispatchEvent(new CustomEvent("personnel:create")), section: "create", color: "#34D399" },
  { id: "create-equipment", label: "Добавить устройство", description: "Открыть форму нового устройства", icon: Monitor, action: () => window.dispatchEvent(new CustomEvent("equipment:create")), section: "create", color: T.amber },
];

const ALL_COMMANDS = [...NAV_COMMANDS, ...CREATE_COMMANDS];

// ── Mode detection ──────────────────────────────────────────────────────────

function detectMode(raw: string): { mode: PaletteMode; cleanQuery: string } {
  if (raw.startsWith("@")) return { mode: "personnel", cleanQuery: raw.slice(1).trim() };
  if (raw.startsWith("#")) return { mode: "equipment", cleanQuery: raw.slice(1).trim() };
  if (raw.startsWith("?")) return { mode: "storage", cleanQuery: raw.slice(1).trim() };
  if (raw.startsWith(">")) return { mode: "commands", cleanQuery: raw.slice(1).trim() };
  return { mode: "all", cleanQuery: raw.trim() };
}

function modeModules(mode: PaletteMode): SearchModule[] {
  switch (mode) {
    case "personnel": return ["personnel"];
    case "equipment": return ["equipment"];
    case "phones": return ["phones"];
    case "storage": return ["storage_items"];
    default: return [];
  }
}

// ── Recent searches ─────────────────────────────────────────────────────────

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}

function pushRecent(q: string, prev: string[]): string[] {
  const next = [q, ...prev.filter(x => x !== q)].slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { }
  return next;
}

// ── Module config ───────────────────────────────────────────────────────────

const MOD: Record<SearchModule, { icon: LucideIcon; color: string; bg: string }> = {
  personnel: { icon: Users, color: "#34D399", bg: "rgba(52,211,153,0.12)" },
  phones: { icon: Smartphone, color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
  equipment: { icon: Monitor, color: T.amber, bg: "rgba(245,158,11,0.12)" },
  storage_items: { icon: Shield, color: "#67E8F9", bg: "rgba(103,232,249,0.12)" },
};

// ── Prefix banner config ────────────────────────────────────────────────────

const PREFIX_BANNERS: Record<string, { color: string; bg: string; label: string; icon: LucideIcon }> = {
  "@": { color: "#34D399", bg: "rgba(52,211,153,0.08)", label: "Поиск по личному составу", icon: Users },
  "#": { color: T.amber, bg: "rgba(245,158,11,0.08)", label: "Поиск по технике", icon: Monitor },
  "?": { color: "#67E8F9", bg: "rgba(103,232,249,0.08)", label: "Поиск носителей и пропусков", icon: Shield },
  ">": { color: "#A78BFA", bg: "rgba(167,139,250,0.08)", label: "Команды и быстрые действия", icon: Zap },
};

// ── Flat item type ──────────────────────────────────────────────────────────

type FlatItem =
  | { kind: "result"; item: SearchResultItem; idx: number }
  | { kind: "command"; cmd: NavCommand; idx: number }
  | { kind: "recent"; text: string; idx: number };

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ label, color }: { label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 pt-3 pb-1">
      <span className="text-[9px] font-bold tracking-[1.5px] uppercase select-none"
        style={{ color: color ?? T.text3 }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{
        background: color ? `linear-gradient(90deg,${color}30,transparent)` : `rgba(255,255,255,0.05)`
      }} />
    </div>
  );
}

function Divider() {
  return <div className="mx-4 my-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />;
}

// Result row ────────────────────────────────────────────────────────────────

function ResultRow({ item, focused, onClick }: { item: SearchResultItem; focused: boolean; onClick(): void }) {
  const cfg = MOD[item.module];
  const Icon = cfg.icon;

  return (
    <button type="button" role="option" aria-selected={focused} onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl text-left transition-all duration-100"
      style={{
        padding: "9px 12px",
        margin: "1px 6px",
        width: "calc(100% - 12px)",
        background: focused ? cfg.bg : "transparent",
        border: `1px solid ${focused ? cfg.color + "25" : "transparent"}`,
        boxShadow: focused ? `0 0 0 0 transparent, inset 0 0 0 0 transparent` : "none",
      }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: focused ? cfg.bg : T.glass, border: `1px solid ${focused ? cfg.color + "30" : T.glassBorder}` }}>
        <Icon className="w-3.5 h-3.5" style={{ color: focused ? cfg.color : T.text3 }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium leading-tight truncate" style={{ color: focused ? T.text1 : T.text2 }}>
          {item.title}
        </p>
        {item.subtitle && (
          <p className="text-[11px] leading-tight truncate mt-0.5" style={{ color: T.text3 }}>
            {item.subtitle}
          </p>
        )}
      </div>

      {item.badge && (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}25` }}>
          {item.badge}
        </span>
      )}

      <ChevronRight className="w-3 h-3 shrink-0 transition-all duration-100"
        style={{
          color: focused ? cfg.color : "transparent",
          transform: focused ? "translateX(0)" : "translateX(-4px)"
        }} />
    </button>
  );
}

// Command row ───────────────────────────────────────────────────────────────

function CommandRow({ cmd, focused, onClick }: { cmd: NavCommand; focused: boolean; onClick(): void }) {
  const Icon = cmd.icon;
  const isCreate = cmd.section === "create";

  return (
    <button type="button" role="option" aria-selected={focused} onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl text-left transition-all duration-100"
      style={{
        padding: "9px 12px",
        margin: "1px 6px",
        width: "calc(100% - 12px)",
        background: focused ? `${cmd.color}10` : "transparent",
        border: `1px solid ${focused ? cmd.color + "25" : "transparent"}`,
      }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: T.glass, border: `1px solid ${focused ? cmd.color + "30" : T.glassBorder}` }}>
        {isCreate
          ? <Plus className="w-3.5 h-3.5" style={{ color: focused ? cmd.color : T.text3 }} />
          : <Icon className="w-3.5 h-3.5" style={{ color: focused ? cmd.color : T.text3 }} />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium leading-tight" style={{ color: focused ? T.text1 : T.text2 }}>
          {cmd.label}
        </p>
        {cmd.description && (
          <p className="text-[11px] leading-tight mt-0.5 truncate" style={{ color: T.text3 }}>
            {cmd.description}
          </p>
        )}
      </div>

      {cmd.shortcut ? (
        <div className="flex items-center gap-0.5 shrink-0">
          {cmd.shortcut.map(k => (
            <kbd key={k} className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold"
              style={{
                background: focused ? `${cmd.color}15` : "rgba(255,255,255,0.05)",
                border: `1px solid ${focused ? cmd.color + "30" : T.glassBorder}`,
                color: focused ? cmd.color : T.text3
              }}>
              {k}
            </kbd>
          ))}
        </div>
      ) : (
        <ChevronRight className="w-3 h-3 shrink-0 transition-all duration-100"
          style={{
            color: focused ? T.text3 : "transparent",
            transform: focused ? "translateX(0)" : "translateX(-4px)"
          }} />
      )}
    </button>
  );
}

// Module group header ────────────────────────────────────────────────────────

function ModuleHeader({ module, count }: { module: SearchModule; count: number }) {
  const cfg = MOD[module];
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-2 px-4 pt-2.5 pb-1">
      <div className="w-[18px] h-[18px] rounded flex items-center justify-center"
        style={{ background: cfg.bg }}>
        <Icon className="w-2.5 h-2.5" style={{ color: cfg.color }} />
      </div>
      <span className="text-[9px] font-bold tracking-[1.5px] uppercase" style={{ color: `${cfg.color}90` }}>
        {MODULE_LABELS[module]}
      </span>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg,${cfg.color}20,transparent)` }} />
      <span className="text-[9px] tabular-nums" style={{ color: T.text3 }}>{count}</span>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [focused, setFocused] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortCtrl = useRef<AbortController | null>(null);

  const { mode, cleanQuery } = useMemo(() => detectMode(query), [query]);
  const prefixChar = ["@", "#", "?", ">"].includes(query[0] ?? "") ? query[0] : null;

  const flatItems = useMemo<FlatItem[]>(() => {
    let idx = 0;
    if (mode === "commands") {
      const filter = cleanQuery.toLowerCase();
      const filtered = filter
        ? ALL_COMMANDS.filter(c => c.label.toLowerCase().includes(filter) || (c.description ?? "").toLowerCase().includes(filter))
        : ALL_COMMANDS;
      return filtered.map(cmd => ({ kind: "command" as const, cmd, idx: idx++ }));
    }
    if (cleanQuery.length >= 2) {
      return results.map(item => ({ kind: "result" as const, item, idx: idx++ }));
    }
    const list: FlatItem[] = [];
    for (const cmd of NAV_COMMANDS) list.push({ kind: "command", cmd, idx: idx++ });
    for (const cmd of CREATE_COMMANDS) list.push({ kind: "command", cmd, idx: idx++ });
    for (const text of recent) list.push({ kind: "recent", text, idx: idx++ });
    return list;
  }, [mode, cleanQuery, results, recent]);

  // scroll focused into view
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focused]);

  const open = useCallback(() => {
    setIsOpen(true);
    setRecent(readRecent());
    setError(false);
    setTimeout(() => inputRef.current?.focus(), 20);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery(""); setResults([]); setFocused(0); setError(false);
    abortCtrl.current?.abort();
  }, []);

  // ⌘K
  useEffect(() => {
    const h = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); isOpen ? close() : open(); }
      if (e.key === "Escape" && isOpen) close();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [isOpen, open, close]);

  // search
  useEffect(() => {
    if (!isOpen || mode === "commands" || cleanQuery.length < 2) {
      setResults([]); setError(false); return;
    }
    if (debounceT.current) clearTimeout(debounceT.current);
    abortCtrl.current?.abort();
    debounceT.current = setTimeout(async () => {
      abortCtrl.current = new AbortController();
      setLoading(true); setError(false);
      const mods = modeModules(mode);
      const url = `/api/search?q=${encodeURIComponent(cleanQuery)}${mods.length ? `&modules=${mods.join(",")}` : ""}&page=1`;
      try {
        const res = await fetch(url, { signal: abortCtrl.current.signal });
        if (!res.ok) throw new Error();
        const data = await res.json() as SearchResults;
        setResults(data.items.slice(0, MAX_RESULTS));
        setFocused(0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") { setError(true); setResults([]); }
      } finally { setLoading(false); }
    }, DEBOUNCE_MS);
    return () => { if (debounceT.current) clearTimeout(debounceT.current); };
  }, [cleanQuery, mode, isOpen]);

  const execute = useCallback((item: FlatItem) => {
    if (item.kind === "result") {
      if (cleanQuery.length >= 2) setRecent(p => pushRecent(cleanQuery, p));
      router.push(item.item.href as Route);
      close();
    } else if (item.kind === "command") {
      if (item.cmd.href) router.push(item.cmd.href as Route);
      else item.cmd.action?.();
      close();
    } else {
      setQuery(item.text);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [cleanQuery, router, close]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setFocused(i => Math.min(i + 1, flatItems.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocused(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const f = flatItems[focused];
      if (f) execute(f);
      else if (cleanQuery.length >= 2) {
        setRecent(p => pushRecent(cleanQuery, p));
        router.push(`/search?q=${encodeURIComponent(cleanQuery)}` as Route);
        close();
      }
    }
  }, [flatItems, focused, cleanQuery, execute, router, close]);

  const grouped = useMemo(() => {
    const m = new Map<SearchModule, SearchResultItem[]>();
    for (const r of results) {
      if (!m.has(r.module)) m.set(r.module, []);
      m.get(r.module)!.push(r);
    }
    return m;
  }, [results]);

  const groupOffsets = useMemo(() => {
    const m = new Map<SearchModule, number>();
    let off = 0;
    for (const [mod, items] of grouped.entries()) { m.set(mod, off); off += items.length; }
    return m;
  }, [grouped]);

  const isSearching = mode !== "commands" && cleanQuery.length >= 2;
  const prefixBanner = prefixChar && query.length >= 1 ? PREFIX_BANNERS[prefixChar] : null;

  // ── Trigger ────────────────────────────────────────────────────────────

  if (!isOpen) {
    return (
      <button onClick={open} aria-label="Открыть поиск (Ctrl+K)"
        className="flex items-center gap-2 transition-all duration-200 focus:outline-none"
        style={{
          height: "34px", padding: "0 12px",
          background: T.glass, border: `1px solid ${T.glassBorder}`,
          borderRadius: "8px", color: T.text2, fontSize: "13px",
        }}
        onMouseEnter={e => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.borderColor = "rgba(59,130,246,0.3)";
          b.style.background = "rgba(59,130,246,0.05)";
          b.style.color = T.text1;
        }}
        onMouseLeave={e => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.borderColor = T.glassBorder;
          b.style.background = T.glass;
          b.style.color = T.text2;
        }}
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Поиск...</span>
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono ml-2"
          style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${T.glassBorder}`, color: T.text3, fontFamily: "JetBrains Mono,monospace" }}>
          ⌘K
        </kbd>
      </button>
    );
  }

  // ── Palette dialog ─────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes cp-in{
          from{opacity:0;transform:translateX(-50%) scale(.97)}
          to{opacity:1;transform:translateX(-50%) scale(1)}
        }
        @keyframes bd-in{from{opacity:0}to{opacity:1}}
      `}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-50" onClick={close} aria-hidden
        style={{ background: "rgba(2,6,23,0.8)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", animation: "bd-in 0.15s ease" }} />

      {/* Dialog */}
      <div role="dialog" aria-modal="true" aria-label="Глобальный поиск"
        className="fixed z-50 flex flex-col overflow-hidden"
        style={{
          left: "50%",
          top: "max(16px, calc(50% - 280px))",   // ← вместо top:"50%"
          transform: "translateX(-50%)",          // ← убрали -50% по Y
          width: "min(580px,calc(100vw - 32px))",
          maxHeight: "min(560px,calc(100vh - 32px))", // ← учитываем отступы
          background: "hsl(220 42% 7% / 0.97)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          boxShadow: "0 0 0 1px rgba(59,130,246,0.06), 0 32px 80px rgba(0,0,0,0.7)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          animation: "cp-in 0.18s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Input bar */}
        <div className="flex items-center gap-3 shrink-0"
          style={{ padding: "0 16px", height: "54px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: T.blue2 }} />
              : <Search className="w-4 h-4" style={{ color: cleanQuery ? T.blue2 : T.text3 }} />
            }
          </div>

          {prefixBanner && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0"
              style={{ background: prefixBanner.bg, color: prefixBanner.color, border: `1px solid ${prefixBanner.color}25` }}>
              <prefixBanner.icon className="w-3 h-3" />
              {prefixBanner.label}
            </span>
          )}

          <input ref={inputRef} type="search" autoComplete="off" spellCheck={false}
            value={query}
            onChange={e => { setQuery(e.target.value); setFocused(0); }}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === "commands" ? "Поиск команд..." :
                mode === "personnel" ? "Поиск по личному составу..." :
                  mode === "equipment" ? "Поиск по технике..." :
                    mode === "storage" ? "Поиск носителей..." :
                      "Поиск... (@люди  #техника  ?носители  >команды)"
            }
            className="flex-1 bg-transparent focus:outline-none"
            style={{ fontSize: "14px", color: T.text1, caretColor: T.blue2 }}
          />

          {query && (
            <button onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all"
              style={{ background: T.glass, color: T.text3 }}>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Content */}
        <div ref={listRef} role="listbox"
          className="flex-1 overflow-y-auto py-2"
          style={{ scrollbarWidth: "thin", scrollbarColor: `rgba(255,255,255,0.06) transparent` }}
        >
          {/* COMMAND MODE */}
          {mode === "commands" && (() => {
            const navItems = flatItems.filter((x): x is FlatItem & { kind: "command" } => x.kind === "command" && x.cmd.section === "nav");
            const createItems = flatItems.filter((x): x is FlatItem & { kind: "command" } => x.kind === "command" && x.cmd.section === "create");
            if (!flatItems.length) return (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Search className="w-8 h-8" style={{ color: "rgba(148,163,184,0.15)" }} />
                <p className="text-sm" style={{ color: T.text3 }}>Команды не найдены</p>
              </div>
            );
            return (<>
              {navItems.length > 0 && (<>
                <SectionLabel label="Навигация" />
                {navItems.map(x => <CommandRow key={x.cmd.id} cmd={x.cmd} focused={x.idx === focused} onClick={() => execute(x)} />)}
              </>)}
              {createItems.length > 0 && (<>
                <Divider />
                <SectionLabel label="Создать" />
                {createItems.map(x => <CommandRow key={x.cmd.id} cmd={x.cmd} focused={x.idx === focused} onClick={() => execute(x)} />)}
              </>)}
            </>);
          })()}

          {/* SEARCH RESULTS */}
          {isSearching && (() => {
            if (loading) return (
              <div className="flex items-center justify-center py-12 gap-2.5">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: T.blue2 }} />
                <span className="text-sm" style={{ color: T.text3 }}>Поиск...</span>
              </div>
            );
            if (error) return (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <AlertCircle className="w-6 h-6" style={{ color: "rgba(239,68,68,0.4)" }} />
                <p className="text-sm" style={{ color: T.text3 }}>Ошибка поиска</p>
              </div>
            );
            if (!grouped.size) return (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Search className="w-8 h-8" style={{ color: "rgba(148,163,184,0.1)" }} />
                <p className="text-sm font-medium" style={{ color: T.text2 }}>Ничего не найдено</p>
                <button className="text-xs mt-0.5" style={{ color: T.blue2 }}
                  onClick={() => { router.push(`/search?q=${encodeURIComponent(cleanQuery)}` as Route); close(); }}>
                  Расширенный поиск →
                </button>
              </div>
            );
            return (<>
              {[...grouped.entries()].map(([mod, items], gi) => {
                const offset = groupOffsets.get(mod) ?? 0;
                return (
                  <div key={mod}>
                    {gi > 0 && <div className="h-px mx-4 my-1.5" style={{ background: "rgba(255,255,255,0.04)" }} />}
                    <ModuleHeader module={mod} count={items.length} />
                    {items.map((item, i) => (
                      <ResultRow key={item.id} item={item}
                        focused={offset + i === focused}
                        onClick={() => execute({ kind: "result", item, idx: offset + i })} />
                    ))}
                  </div>
                );
              })}
            </>);
          })()}

          {/* IDLE STATE */}
          {!isSearching && mode !== "commands" && (() => {
            const navItems = flatItems.filter((x): x is FlatItem & { kind: "command" } => x.kind === "command" && x.cmd.section === "nav");
            const createItems = flatItems.filter((x): x is FlatItem & { kind: "command" } => x.kind === "command" && x.cmd.section === "create");
            const recentItems = flatItems.filter((x): x is FlatItem & { kind: "recent" } => x.kind === "recent");
            return (<>
              <SectionLabel label="Навигация" />
              {navItems.map(x => <CommandRow key={x.cmd.id} cmd={x.cmd} focused={x.idx === focused} onClick={() => execute(x)} />)}
              <Divider />
              <SectionLabel label="Создать" />
              {createItems.map(x => <CommandRow key={x.cmd.id} cmd={x.cmd} focused={x.idx === focused} onClick={() => execute(x)} />)}
              {recentItems.length > 0 && (<>
                <Divider />
                <SectionLabel label="Недавние" />
                {recentItems.map(x => (
                  <button key={x.text} type="button" role="option" aria-selected={x.idx === focused}
                    onClick={() => execute(x)}
                    className="w-full flex items-center gap-3 rounded-xl text-left transition-all duration-100"
                    style={{
                      padding: "9px 12px", margin: "1px 6px", width: "calc(100% - 12px)",
                      background: x.idx === focused ? T.glass : "transparent",
                      border: `1px solid ${x.idx === focused ? T.glassBorder : "transparent"}`,
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.glass }}>
                      <Clock className="w-3.5 h-3.5" style={{ color: T.text3 }} />
                    </div>
                    <span className="text-[13px] flex-1 truncate" style={{ color: x.idx === focused ? T.text1 : T.text3 }}>
                      {x.text}
                    </span>
                    <ChevronRight className="w-3 h-3 shrink-0 transition-opacity"
                      style={{ color: T.text3, opacity: x.idx === focused ? 0.5 : 0 }} />
                  </button>
                ))}
              </>)}
            </>);
          })()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between shrink-0"
          style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.15)" }}>

          <div className="flex items-center gap-3">
            {[["↑↓", "выбор"], ["↵", "открыть"], ["Esc", "закрыть"]].map(([k, l]) => (
              <span key={k} className="flex items-center gap-1.5" style={{ fontSize: "10px", color: T.text3 }}>
                <kbd style={{
                  padding: "2px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${T.glassBorder}`, fontFamily: "JetBrains Mono,monospace",
                  fontSize: "9px", color: T.text3
                }}>{k}</kbd>
                <span>{l}</span>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2" style={{ fontSize: "10px", color: T.text3 }}>
            {isSearching ? (
              <button className="flex items-center gap-1 hover:opacity-70 transition-opacity"
                style={{ color: T.blue2 }}
                onClick={() => {
                  setRecent(p => pushRecent(cleanQuery, p));
                  router.push(`/search?q=${encodeURIComponent(cleanQuery)}` as Route);
                  close();
                }}>
                Все результаты <ArrowRight className="w-2.5 h-2.5" />
              </button>
            ) : (
              <span style={{ fontFamily: "JetBrains Mono,monospace", letterSpacing: "1px" }}>
                <span style={{ color: "#34D399" }}>@</span>{" "}
                <span style={{ color: T.amber }}>#</span>{" "}
                <span style={{ color: "#67E8F9" }}>?</span>{" "}
                <span style={{ color: "#A78BFA" }}>&gt;</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}