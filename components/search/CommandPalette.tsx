"use client";

/**
 * CommandPalette v2 — Production-grade global search/command palette
 *
 * ── Prefix routing ─────────────────────────────────────────────────────────
 *   (пусто)  — Quick nav + create shortcuts + recent searches
 *   query    — Global search across all modules
 *   @query   — Personnel only  (e.g. "@иванов")
 *   #query   — Equipment only  (e.g. "#ноутбук" or "#АА001")
 *   ?query   — Storage/passes  (e.g. "?ФЛ-001")
 *   >query   — Navigation/action commands
 *
 * ── Keyboard ──────────────────────────────────────────────────────────────
 *   Ctrl/Cmd+K  — Open / Close
 *   ↑ ↓         — Navigate results
 *   Enter       — Execute focused item
 *   Escape      — Close
 *
 * ── Scalability notes ─────────────────────────────────────────────────────
 *   • Current: PostgreSQL FTS (tsvector / GIN index) — solid to ~500k rows.
 *   • 500k-2M: Add Redis layer (ioredis) — cache top-N results per query,
 *     TTL 30 s, invalidate on revalidatePath triggers.
 *   • 2M+: Drop-in replace with Meilisearch (self-hosted, air-gap friendly)
 *     or Typesense — sync via pg_notify + background worker.
 *   • Client perf: debounce 180 ms + AbortController already eliminate
 *     redundant fetches. For even faster feel, add optimistic local filter
 *     from last successful result set before the new fetch lands.
 */

import {
  useEffect, useRef, useState, useCallback, useMemo,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search, Loader2, Users, Smartphone, Monitor, Shield,
  ArrowRight, Clock, Hash, AtSign, ChevronRight, Zap,
  LayoutDashboard, UserCog, X, Plus, HelpCircle,
} from "lucide-react";
import type { Route } from "next";
import type { SearchResults, SearchResultItem, SearchModule } from "@/types/search";
import { MODULE_LABELS } from "@/types/search";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────

const RECENT_KEY       = "__zgt_recent_v2";
const MAX_RECENT       = 6;
const DEBOUNCE_MS      = 180;
const MAX_PALETTE_HITS = 14;

// ── Palette mode ───────────────────────────────────────────────────────────

type PaletteMode = "all" | "personnel" | "equipment" | "phones" | "storage" | "commands";

interface NavCommand {
  id:          string;
  label:       string;
  description?: string;
  icon:        React.ComponentType<{ className?: string }>;
  href?:       string;
  action?:     () => void;
  shortcut?:   string;
  section:     "nav" | "create";
}

// ── Static command registry ────────────────────────────────────────────────

const NAV_COMMANDS: NavCommand[] = [
  {
    id: "nav-home",
    label: "Дашборд",
    icon: LayoutDashboard,
    href: "/",
    shortcut: "G H",
    section: "nav",
  },
  {
    id: "nav-personnel",
    label: "Личный состав",
    icon: Users,
    href: "/personnel",
    shortcut: "G P",
    section: "nav",
  },
  {
    id: "nav-phones",
    label: "Телефоны",
    icon: Smartphone,
    href: "/phones",
    shortcut: "G T",
    section: "nav",
  },
  {
    id: "nav-equipment",
    label: "Вычислительная техника",
    icon: Monitor,
    href: "/equipment",
    shortcut: "G E",
    section: "nav",
  },
  {
    id: "nav-storage",
    label: "Носители и пропуска",
    icon: Shield,
    href: "/storage-and-passes",
    shortcut: "G N",
    section: "nav",
  },
  {
    id: "nav-users",
    label: "Пользователи системы",
    icon: UserCog,
    href: "/users",
    section: "nav",
  },
];

const CREATE_COMMANDS: NavCommand[] = [
  {
    id: "create-personnel",
    label: "Добавить сотрудника",
    description: "Открыть форму нового сотрудника",
    icon: Users,
    action: () =>
      window.dispatchEvent(new CustomEvent("personnel:create")),
    section: "create",
  },
  {
    id: "create-equipment",
    label: "Добавить устройство",
    description: "Открыть форму нового устройства",
    icon: Monitor,
    action: () =>
      window.dispatchEvent(new CustomEvent("equipment:create")),
    section: "create",
  },
];

const ALL_COMMANDS = [...NAV_COMMANDS, ...CREATE_COMMANDS];

// ── Mode detection ─────────────────────────────────────────────────────────

function detectMode(raw: string): { mode: PaletteMode; cleanQuery: string } {
  if (raw.startsWith("@"))
    return { mode: "personnel", cleanQuery: raw.slice(1).trim() };
  if (raw.startsWith("#"))
    return { mode: "equipment", cleanQuery: raw.slice(1).trim() };
  if (raw.startsWith("?"))
    return { mode: "storage",   cleanQuery: raw.slice(1).trim() };
  if (raw.startsWith(">"))
    return { mode: "commands",  cleanQuery: raw.slice(1).trim() };
  return { mode: "all", cleanQuery: raw.trim() };
}

function modeModules(mode: PaletteMode): SearchModule[] {
  switch (mode) {
    case "personnel": return ["personnel"];
    case "equipment": return ["equipment"];
    case "phones":    return ["phones"];
    case "storage":   return ["storage_items"];
    default:          return []; // empty = all modules
  }
}

// ── Recent searches (localStorage) ────────────────────────────────────────

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function pushRecent(q: string, prev: string[]): string[] {
  const next = [q, ...prev.filter((x) => x !== q)].slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
  return next;
}

// ── Module icon / color palette ────────────────────────────────────────────

const MOD_ICON: Record<SearchModule, React.ComponentType<{ className?: string }>> = {
  personnel:     Users,
  phones:        Smartphone,
  equipment:     Monitor,
  storage_items: Shield,
};

const MOD_COLOR: Record<SearchModule, string> = {
  personnel:     "text-blue-500 bg-blue-500/10",
  phones:        "text-emerald-500 bg-emerald-500/10",
  equipment:     "text-violet-500 bg-violet-500/10",
  storage_items: "text-amber-500 bg-amber-500/10",
};

// ── Flat item union (for keyboard-nav index) ───────────────────────────────

type FlatItem =
  | { kind: "result";  item: SearchResultItem; idx: number }
  | { kind: "command"; cmd:  NavCommand;        idx: number }
  | { kind: "recent";  text: string;            idx: number };

// ── Sub-components ─────────────────────────────────────────────────────────

function ResultRow({
  item, focused, onClick,
}: {
  item: SearchResultItem;
  focused: boolean;
  onClick: () => void;
}) {
  const Icon = MOD_ICON[item.module];
  return (
    <button
      type="button"
      role="option"
      aria-selected={focused}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors",
        focused
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-foreground"
      )}
    >
      <div
        className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors",
          focused ? "bg-white/20" : MOD_COLOR[item.module]
        )}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{item.title}</p>
        {item.subtitle && (
          <p
            className={cn(
              "text-xs leading-tight truncate mt-0.5",
              focused ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {item.subtitle}
          </p>
        )}
      </div>

      {item.badge && (
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
            focused
              ? "bg-white/20 text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {item.badge}
        </span>
      )}
    </button>
  );
}

function CommandRow({
  cmd, focused, onClick,
}: {
  cmd:     NavCommand;
  focused: boolean;
  onClick: () => void;
}) {
  const Icon = cmd.icon;
  return (
    <button
      type="button"
      role="option"
      aria-selected={focused}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors",
        focused ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
      )}
    >
      <div
        className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
          focused ? "bg-white/20" : "bg-muted"
        )}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{cmd.label}</p>
        {cmd.description && (
          <p
            className={cn(
              "text-xs leading-tight mt-0.5",
              focused ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {cmd.description}
          </p>
        )}
      </div>

      {cmd.shortcut ? (
        <div className="flex items-center gap-0.5 shrink-0">
          {cmd.shortcut.split(" ").map((k) => (
            <kbd
              key={k}
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-mono border",
                focused
                  ? "bg-white/20 border-white/30 text-primary-foreground"
                  : "bg-background border-border text-muted-foreground"
              )}
            >
              {k}
            </kbd>
          ))}
        </div>
      ) : cmd.section === "create" ? (
        <Plus
          className={cn(
            "w-3.5 h-3.5 shrink-0",
            focused ? "text-primary-foreground/60" : "text-muted-foreground/40"
          )}
        />
      ) : (
        <ChevronRight
          className={cn(
            "w-3.5 h-3.5 shrink-0",
            focused ? "text-primary-foreground/60" : "text-muted-foreground/40"
          )}
        />
      )}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest select-none">
      {children}
    </p>
  );
}

// ── Main palette ───────────────────────────────────────────────────────────

export function CommandPalette() {
  const [isOpen,         setIsOpen]         = useState(false);
  const [query,          setQuery]          = useState("");
  const [results,        setResults]        = useState<SearchResultItem[]>([]);
  const [isLoading,      setIsLoading]      = useState(false);
  const [focusedIdx,     setFocusedIdx]     = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const router     = useRouter();
  const inputRef   = useRef<HTMLInputElement>(null);
  const listRef    = useRef<HTMLDivElement>(null);
  const debounceT  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortCtrl  = useRef<AbortController | null>(null);

  const { mode, cleanQuery } = useMemo(() => detectMode(query), [query]);

  // ── Build flat list for keyboard nav ──────────────────────────────────────

  const flatItems = useMemo<FlatItem[]>(() => {
    let idx = 0;

    // "> command" mode
    if (mode === "commands") {
      const filter = cleanQuery.toLowerCase();
      const filtered = filter
        ? ALL_COMMANDS.filter(
            (c) =>
              c.label.toLowerCase().includes(filter) ||
              (c.description ?? "").toLowerCase().includes(filter)
          )
        : ALL_COMMANDS;
      return filtered.map((cmd) => ({ kind: "command" as const, cmd, idx: idx++ }));
    }

    // Active search (≥2 chars)
    if (cleanQuery.length >= 2) {
      return results.map((item) => ({ kind: "result" as const, item, idx: idx++ }));
    }

    // Idle: quick nav + create + recent
    const list: FlatItem[] = [];
    for (const cmd of NAV_COMMANDS)    list.push({ kind: "command", cmd,  idx: idx++ });
    for (const cmd of CREATE_COMMANDS) list.push({ kind: "command", cmd,  idx: idx++ });
    for (const text of recentSearches) list.push({ kind: "recent",  text, idx: idx++ });
    return list;
  }, [mode, cleanQuery, results, recentSearches]);

  // ── Auto-scroll focused item into view ────────────────────────────────────

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedIdx]);

  // ── Open / close ──────────────────────────────────────────────────────────

  const open = useCallback(() => {
    setIsOpen(true);
    setRecentSearches(readRecent());
    setTimeout(() => inputRef.current?.focus(), 20);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setFocusedIdx(0);
    abortCtrl.current?.abort();
  }, []);

  // ── Global Ctrl/Cmd+K ──────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        isOpen ? close() : open();
      }
      if (e.key === "Escape" && isOpen) close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, open, close]);

  // ── Fetch search results ───────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen || mode === "commands" || cleanQuery.length < 2) {
      setResults([]);
      return;
    }

    if (debounceT.current) clearTimeout(debounceT.current);
    abortCtrl.current?.abort();

    debounceT.current = setTimeout(async () => {
      abortCtrl.current = new AbortController();
      setIsLoading(true);

      const modules = modeModules(mode);
      const mParam  = modules.length ? `&modules=${modules.join(",")}` : "";
      const url     = `/api/search?q=${encodeURIComponent(cleanQuery)}${mParam}&page=1`;

      try {
        const res  = await fetch(url, { signal: abortCtrl.current.signal });
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as SearchResults;
        setResults(data.items.slice(0, MAX_PALETTE_HITS));
        setFocusedIdx(0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => { if (debounceT.current) clearTimeout(debounceT.current); };
  }, [cleanQuery, mode, isOpen]);

  // ── Execute focused / clicked item ────────────────────────────────────────

  const execute = useCallback((item: FlatItem) => {
    if (item.kind === "result") {
      if (cleanQuery.length >= 2)
        setRecentSearches((p) => pushRecent(cleanQuery, p));
      router.push(item.item.href as Route);
      close();
    } else if (item.kind === "command") {
      if (item.cmd.href)    router.push(item.cmd.href as Route);
      else if (item.cmd.action) item.cmd.action();
      close();
    } else {
      // recent search — fill input
      setQuery(item.text);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [cleanQuery, router, close]);

  // ── Keyboard navigation ───────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIdx((i) => Math.min(i + 1, flatItems.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIdx((i) => Math.max(i - 1, 0));
        break;
      case "Enter": {
        e.preventDefault();
        const focused = flatItems[focusedIdx];
        if (focused) {
          execute(focused);
        } else if (cleanQuery.length >= 2) {
          setRecentSearches((p) => pushRecent(cleanQuery, p));
          router.push(`/search?q=${encodeURIComponent(cleanQuery)}` as Route);
          close();
        }
        break;
      }
    }
  }, [flatItems, focusedIdx, cleanQuery, execute, router, close]);

  // ── Grouped results for display ───────────────────────────────────────────

  const grouped = useMemo<Map<SearchModule, SearchResultItem[]>>(() => {
    const map = new Map<SearchModule, SearchResultItem[]>();
    for (const item of results) {
      if (!map.has(item.module)) map.set(item.module, []);
      map.get(item.module)!.push(item);
    }
    return map;
  }, [results]);

  // Build per-group flat-index offset map (needed to sync focusedIdx)
  const groupOffset = useMemo<Map<SearchModule, number>>(() => {
    const m = new Map<SearchModule, number>();
    let offset = 0;
    for (const [mod, items] of grouped.entries()) {
      m.set(mod, offset);
      offset += items.length;
    }
    return m;
  }, [grouped]);

  // ── Trigger button (collapsed state) ─────────────────────────────────────

  if (!isOpen) {
    return (
      <button
        onClick={open}
        aria-label="Открыть поиск (⌘K)"
        className={cn(
          "flex items-center gap-2 h-9 px-3 rounded-lg",
          "bg-muted/60 border border-border",
          "text-sm text-muted-foreground",
          "hover:bg-muted hover:text-foreground",
          "transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
        )}
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Поиск...</span>
        <div className="hidden sm:flex items-center gap-0.5 ml-1">
          <kbd className="text-[10px] px-1 py-0.5 rounded border border-border bg-background font-mono leading-none">
            ⌘
          </kbd>
          <kbd className="text-[10px] px-1 py-0.5 rounded border border-border bg-background font-mono leading-none">
            K
          </kbd>
        </div>
      </button>
    );
  }

  // ── Mode indicator badge ──────────────────────────────────────────────────

  const modeBadge = {
    personnel: { label: "Сотрудники",  color: "text-blue-500   bg-blue-500/10",   icon: AtSign },
    equipment: { label: "Техника",     color: "text-violet-500 bg-violet-500/10", icon: Hash   },
    storage:   { label: "Носители",    color: "text-amber-500  bg-amber-500/10",  icon: HelpCircle },
    commands:  { label: "Команды",     color: "text-foreground bg-muted",         icon: Zap    },
  } satisfies Partial<Record<PaletteMode, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }>>;

  const currentBadge = mode !== "all" && mode !== "phones"
    ? modeBadge[mode as keyof typeof modeBadge]
    : null;

  // ── Full palette ──────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={close}
        aria-hidden
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Глобальный поиск"
        className={cn(
          "fixed left-1/2 top-[8vh] -translate-x-1/2 z-50",
          "w-full max-w-2xl mx-4",
          "bg-card border border-border rounded-2xl shadow-2xl",
          "overflow-hidden flex flex-col",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-top-4 duration-200",
          "max-h-[80vh]"
        )}
      >
        {/* ── Input bar ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border shrink-0">
          {/* Left icon / mode badge */}
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
          ) : currentBadge ? (
            <div
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md",
                "text-xs font-semibold shrink-0 whitespace-nowrap",
                currentBadge.color
              )}
            >
              <currentBadge.icon className="w-3 h-3" />
              {currentBadge.label}
            </div>
          ) : (
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          )}

          {/* Input */}
          <input
            ref={inputRef}
            type="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setFocusedIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === "commands"  ? "Введите команду или действие..." :
              mode === "personnel" ? "Поиск по ФИО, личному номеру, должности..." :
              mode === "equipment" ? "Поиск по названию, инв. номеру, серийному номеру..." :
              mode === "storage"   ? "Поиск носителей и электронных пропусков..." :
              "Поиск... (@сотрудники  #техника  ?носители  >команды)"
            }
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/70 focus:outline-none"
          />

          {query && (
            <button
              type="button"
              aria-label="Очистить строку поиска"
              onClick={() => {
                setQuery("");
                setResults([]);
                inputRef.current?.focus();
              }}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Prefix hint (single prefix char typed) ─────────────────────── */}
        {query.length === 1 && ["@", "#", "?", ">"].includes(query) && (
          <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-b border-border shrink-0">
            {query === "@" && "Введите ФИО, личный номер или звание сотрудника"}
            {query === "#" && "Введите название устройства, инвентарный или серийный номер"}
            {query === "?" && "Введите серийный или инвентарный номер носителя / пропуска"}
            {query === ">" && "Введите название раздела или действия"}
          </div>
        )}

        {/* ── Results list ────────────────────────────────────────────────── */}
        <div
          ref={listRef}
          role="listbox"
          aria-label="Результаты поиска"
          className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-0.5"
        >
          {/* ── COMMAND mode ──────────────────────────────────────────────── */}
          {mode === "commands" && (
            <>
              {flatItems.length === 0 ? (
                <p className="text-center py-10 text-sm text-muted-foreground">
                  Команды не найдены
                </p>
              ) : (
                <>
                  {/* Group nav vs create */}
                  {flatItems.some((x) => x.kind === "command" && x.cmd.section === "nav") && (
                    <SectionLabel>Навигация</SectionLabel>
                  )}
                  {flatItems
                    .filter((x): x is FlatItem & { kind: "command" } =>
                      x.kind === "command" && x.cmd.section === "nav"
                    )
                    .map((x) => (
                      <CommandRow
                        key={x.cmd.id}
                        cmd={x.cmd}
                        focused={x.idx === focusedIdx}
                        onClick={() => execute(x)}
                      />
                    ))}

                  {flatItems.some((x) => x.kind === "command" && x.cmd.section === "create") && (
                    <SectionLabel>Создать</SectionLabel>
                  )}
                  {flatItems
                    .filter((x): x is FlatItem & { kind: "command" } =>
                      x.kind === "command" && x.cmd.section === "create"
                    )
                    .map((x) => (
                      <CommandRow
                        key={x.cmd.id}
                        cmd={x.cmd}
                        focused={x.idx === focusedIdx}
                        onClick={() => execute(x)}
                      />
                    ))}
                </>
              )}
            </>
          )}

          {/* ── ACTIVE SEARCH results (grouped by module) ───────────────── */}
          {mode !== "commands" && cleanQuery.length >= 2 && (
            <>
              {grouped.size === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Search className="w-5 h-5 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Ничего не найдено</p>
                  <p className="text-xs text-muted-foreground">
                    Попробуйте другой запрос или{" "}
                    <button
                      type="button"
                      className="text-primary underline hover:no-underline"
                      onClick={() => {
                        router.push(
                          `/search?q=${encodeURIComponent(cleanQuery)}` as Route
                        );
                        close();
                      }}
                    >
                      расширенный поиск
                    </button>
                  </p>
                </div>
              )}

              {[...grouped.entries()].map(([mod, items]) => {
                const ModIcon = MOD_ICON[mod];
                const offset  = groupOffset.get(mod) ?? 0;
                return (
                  <div key={mod}>
                    {/* Group header */}
                    <div className="flex items-center gap-2 px-2 py-1">
                      <ModIcon
                        className={cn(
                          "w-3 h-3",
                          MOD_COLOR[mod].split(" ")[0]
                        )}
                      />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                        {MODULE_LABELS[mod]}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50">
                        ({items.length})
                      </span>
                    </div>

                    {/* Items */}
                    {items.map((item, i) => (
                      <ResultRow
                        key={item.id}
                        item={item}
                        focused={offset + i === focusedIdx}
                        onClick={() =>
                          execute({ kind: "result", item, idx: offset + i })
                        }
                      />
                    ))}
                  </div>
                );
              })}
            </>
          )}

          {/* ── IDLE state: quick nav + create + recent ──────────────────── */}
          {mode !== "commands" && cleanQuery.length < 2 && (
            <>
              <SectionLabel>Перейти</SectionLabel>
              {flatItems
                .filter((x): x is FlatItem & { kind: "command" } =>
                  x.kind === "command" && x.cmd.section === "nav"
                )
                .map((x) => (
                  <CommandRow
                    key={x.cmd.id}
                    cmd={x.cmd}
                    focused={x.idx === focusedIdx}
                    onClick={() => execute(x)}
                  />
                ))}

              <SectionLabel>Создать</SectionLabel>
              {flatItems
                .filter((x): x is FlatItem & { kind: "command" } =>
                  x.kind === "command" && x.cmd.section === "create"
                )
                .map((x) => (
                  <CommandRow
                    key={x.cmd.id}
                    cmd={x.cmd}
                    focused={x.idx === focusedIdx}
                    onClick={() => execute(x)}
                  />
                ))}

              {recentSearches.length > 0 && (
                <>
                  <SectionLabel>Недавние поиски</SectionLabel>
                  {flatItems
                    .filter((x): x is FlatItem & { kind: "recent" } =>
                      x.kind === "recent"
                    )
                    .map((x) => (
                      <button
                        key={x.text}
                        type="button"
                        role="option"
                        aria-selected={x.idx === focusedIdx}
                        onClick={() => execute(x)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors",
                          x.idx === focusedIdx
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        <Clock
                          className={cn(
                            "w-3.5 h-3.5 shrink-0",
                            x.idx === focusedIdx
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          )}
                        />
                        <span className="text-sm flex-1 truncate">{x.text}</span>
                        <ChevronRight
                          className={cn(
                            "w-3.5 h-3.5 shrink-0",
                            x.idx === focusedIdx
                              ? "text-primary-foreground/50"
                              : "text-muted-foreground/30"
                          )}
                        />
                      </button>
                    ))}
                </>
              )}
            </>
          )}
        </div>

        {/* ── Footer legend ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            {[
              ["↑↓", "навигация"],
              ["↵",  "выбрать"],
              ["Esc","закрыть"],
            ].map(([key, label]) => (
              <span key={key} className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono">
                  {key}
                </kbd>
                {label}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {cleanQuery.length >= 2 && mode !== "commands" && (
              <Link
                href={`/search?q=${encodeURIComponent(cleanQuery)}` as Route}
                onClick={() => {
                  setRecentSearches((p) => pushRecent(cleanQuery, p));
                  close();
                }}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Все результаты
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
            {cleanQuery.length < 2 && (
              <span className="text-muted-foreground/50">
                @ · # · ? · &gt; — префиксы
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}