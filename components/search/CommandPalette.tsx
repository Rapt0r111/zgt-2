"use client";

/**
 * CommandPalette v3 — Redesigned for readability and UX clarity.
 *
 * FIXES vs v2:
 *  - Proper visual hierarchy: clear sections, better spacing
 *  - Module badges with distinct colors per category
 *  - Keyboard shortcut chips that are readable
 *  - Better empty / loading states
 *  - Result items show relevant icon + proper subtitle
 *  - Cleaner idle state: nav vs create are visually distinct
 *  - Fixed: search now correctly uses /api/search which calls fixed search.server.ts
 *
 * Prefix routing:
 *   @query → Personnel  | #query → Equipment
 *   ?query → Storage    | >query → Commands
 *   (blank) → All modules
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  Users,
  Smartphone,
  Monitor,
  Shield,
  ArrowRight,
  Clock,
  Hash,
  AtSign,
  ChevronRight,
  Zap,
  LayoutDashboard,
  UserCog,
  X,
  Plus,
  Command,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import type { Route } from "next";
import type { SearchResults, SearchResultItem, SearchModule } from "@/types/search";
import { MODULE_LABELS } from "@/types/search";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────

const RECENT_KEY = "__zgt_recent_v3";
const MAX_RECENT = 5;
const DEBOUNCE_MS = 220;
const MAX_RESULTS = 12;

// ── Types ──────────────────────────────────────────────────────────────────

type PaletteMode = "all" | "personnel" | "equipment" | "phones" | "storage" | "commands";

interface NavCommand {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  action?: () => void;
  shortcut?: string[];
  section: "nav" | "create";
}

// ── Command registry ───────────────────────────────────────────────────────

const NAV_COMMANDS: NavCommand[] = [
  { id: "nav-home",      label: "Дашборд",              icon: LayoutDashboard, href: "/",                   shortcut: ["G", "H"], section: "nav" },
  { id: "nav-personnel", label: "Личный состав",         icon: Users,           href: "/personnel",          shortcut: ["G", "P"], section: "nav" },
  { id: "nav-phones",    label: "Телефоны",              icon: Smartphone,      href: "/phones",             shortcut: ["G", "T"], section: "nav" },
  { id: "nav-equipment", label: "Вычислительная техника",icon: Monitor,         href: "/equipment",          shortcut: ["G", "E"], section: "nav" },
  { id: "nav-storage",   label: "Носители и пропуска",   icon: Shield,          href: "/storage-and-passes", shortcut: ["G", "N"], section: "nav" },
  { id: "nav-users",     label: "Пользователи системы",  icon: UserCog,         href: "/users",                                    section: "nav" },
];

const CREATE_COMMANDS: NavCommand[] = [
  {
    id: "create-personnel",
    label: "Добавить сотрудника",
    description: "Открыть форму нового сотрудника",
    icon: Users,
    action: () => window.dispatchEvent(new CustomEvent("personnel:create")),
    section: "create",
  },
  {
    id: "create-equipment",
    label: "Добавить устройство",
    description: "Открыть форму нового устройства",
    icon: Monitor,
    action: () => window.dispatchEvent(new CustomEvent("equipment:create")),
    section: "create",
  },
];

const ALL_COMMANDS = [...NAV_COMMANDS, ...CREATE_COMMANDS];

// ── Mode detection ─────────────────────────────────────────────────────────

function detectMode(raw: string): { mode: PaletteMode; cleanQuery: string } {
  if (raw.startsWith("@")) return { mode: "personnel", cleanQuery: raw.slice(1).trim() };
  if (raw.startsWith("#")) return { mode: "equipment",  cleanQuery: raw.slice(1).trim() };
  if (raw.startsWith("?")) return { mode: "storage",    cleanQuery: raw.slice(1).trim() };
  if (raw.startsWith(">")) return { mode: "commands",   cleanQuery: raw.slice(1).trim() };
  return { mode: "all", cleanQuery: raw.trim() };
}

function modeModules(mode: PaletteMode): SearchModule[] {
  switch (mode) {
    case "personnel": return ["personnel"];
    case "equipment": return ["equipment"];
    case "phones":    return ["phones"];
    case "storage":   return ["storage_items"];
    default:          return [];
  }
}

// ── Recent searches ────────────────────────────────────────────────────────

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}

function pushRecent(q: string, prev: string[]): string[] {
  const next = [q, ...prev.filter((x) => x !== q)].slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
  return next;
}

// ── Module visual config ───────────────────────────────────────────────────

const MOD_CONFIG: Record<SearchModule, {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  badge: string;
}> = {
  personnel:     { icon: Users,       iconBg: "bg-blue-500/15",   iconColor: "text-blue-500",   badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  phones:        { icon: Smartphone,  iconBg: "bg-emerald-500/15",iconColor: "text-emerald-500",badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  equipment:     { icon: Monitor,     iconBg: "bg-violet-500/15", iconColor: "text-violet-500", badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  storage_items: { icon: Shield,      iconBg: "bg-amber-500/15",  iconColor: "text-amber-500",  badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
};

// ── Flat item type for keyboard nav ────────────────────────────────────────

type FlatItem =
  | { kind: "result"; item: SearchResultItem; idx: number }
  | { kind: "command"; cmd: NavCommand; idx: number }
  | { kind: "recent"; text: string; idx: number };

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-3 pb-1.5">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60 select-none">
        {children}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="mx-3 my-1 h-px bg-border/60" />;
}

function ResultRow({
  item,
  focused,
  onClick,
}: {
  item: SearchResultItem;
  focused: boolean;
  onClick: () => void;
}) {
  const cfg = MOD_CONFIG[item.module];
  const Icon = cfg.icon;

  return (
    <button
      type="button"
      role="option"
      aria-selected={focused}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-100",
        focused
          ? "bg-primary text-primary-foreground shadow-sm"
          : "hover:bg-muted/70 text-foreground"
      )}
    >
      {/* Module icon */}
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
          focused ? "bg-white/20" : cfg.iconBg
        )}
      >
        <Icon className={cn("w-4 h-4 transition-colors", focused ? "text-primary-foreground" : cfg.iconColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium leading-tight truncate", focused ? "text-primary-foreground" : "text-foreground")}>
          {item.title}
        </p>
        {item.subtitle && (
          <p className={cn("text-xs leading-tight truncate mt-0.5", focused ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {item.subtitle}
          </p>
        )}
      </div>

      {/* Status badge */}
      {item.badge && (
        <span
          className={cn(
            "text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 border",
            focused
              ? "bg-white/20 border-white/20 text-primary-foreground"
              : cn(cfg.badge, "border-transparent")
          )}
        >
          {item.badge}
        </span>
      )}

      <ChevronRight
        className={cn(
          "w-3.5 h-3.5 shrink-0 opacity-0 transition-opacity",
          focused && "opacity-60 text-primary-foreground"
        )}
      />
    </button>
  );
}

function CommandRow({
  cmd,
  focused,
  onClick,
}: {
  cmd: NavCommand;
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
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-100",
        focused
          ? "bg-primary text-primary-foreground shadow-sm"
          : "hover:bg-muted/70 text-foreground"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          focused ? "bg-white/20" : "bg-muted"
        )}
      >
        {cmd.section === "create"
          ? <Plus className={cn("w-4 h-4", focused ? "text-primary-foreground" : "text-muted-foreground")} />
          : <Icon className={cn("w-4 h-4", focused ? "text-primary-foreground" : "text-muted-foreground")} />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium leading-tight", focused ? "text-primary-foreground" : "text-foreground")}>
          {cmd.label}
        </p>
        {cmd.description && (
          <p className={cn("text-xs leading-tight mt-0.5 truncate", focused ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {cmd.description}
          </p>
        )}
      </div>

      {/* Keyboard shortcut */}
      {cmd.shortcut ? (
        <div className="flex items-center gap-0.5 shrink-0 ml-2">
          {cmd.shortcut.map((k) => (
            <kbd
              key={k}
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border",
                focused
                  ? "bg-white/15 border-white/25 text-primary-foreground"
                  : "bg-muted border-border text-muted-foreground"
              )}
            >
              {k}
            </kbd>
          ))}
        </div>
      ) : (
        <ChevronRight
          className={cn(
            "w-3.5 h-3.5 shrink-0 transition-opacity",
            focused ? "opacity-60 text-primary-foreground" : "opacity-0 group-hover:opacity-40"
          )}
        />
      )}
    </button>
  );
}

function ModuleGroupHeader({ module, count }: { module: SearchModule; count: number }) {
  const cfg = MOD_CONFIG[module];
  const Icon = cfg.icon;

  return (
    <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
      <Icon className={cn("w-3.5 h-3.5 shrink-0", cfg.iconColor)} />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        {MODULE_LABELS[module]}
      </span>
      <span className="text-[10px] text-muted-foreground/40 tabular-nums">({count})</span>
    </div>
  );
}

// ── Prefix hint ────────────────────────────────────────────────────────────

const PREFIX_HINTS: Record<string, { icon: React.ComponentType<{ className?: string }>; text: string; color: string }> = {
  "@": { icon: Users,      text: "Поиск по ФИО, личному номеру, должности",             color: "text-blue-500" },
  "#": { icon: Monitor,    text: "Поиск по технике: названию, инв. и серийному номеру", color: "text-violet-500" },
  "?": { icon: Shield,     text: "Поиск носителей и электронных пропусков",             color: "text-amber-500" },
  ">": { icon: Zap,        text: "Команды навигации и быстрые действия",                color: "text-emerald-500" },
};

// ── Main component ─────────────────────────────────────────────────────────

export function CommandPalette() {
  const [isOpen,         setIsOpen]         = useState(false);
  const [query,          setQuery]          = useState("");
  const [results,        setResults]        = useState<SearchResultItem[]>([]);
  const [isLoading,      setIsLoading]      = useState(false);
  const [hasError,       setHasError]       = useState(false);
  const [focusedIdx,     setFocusedIdx]     = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const router    = useRouter();
  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);
  const debounceT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortCtrl = useRef<AbortController | null>(null);

  const { mode, cleanQuery } = useMemo(() => detectMode(query), [query]);
  const prefixChar = ["@", "#", "?", ">"].includes(query[0] ?? "") ? query[0] : null;

  // Build flat keyboard-nav list
  const flatItems = useMemo<FlatItem[]>(() => {
    let idx = 0;

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

    if (cleanQuery.length >= 2) {
      return results.map((item) => ({ kind: "result" as const, item, idx: idx++ }));
    }

    // Idle: nav + create + recent
    const list: FlatItem[] = [];
    for (const cmd of NAV_COMMANDS)    list.push({ kind: "command", cmd, idx: idx++ });
    for (const cmd of CREATE_COMMANDS) list.push({ kind: "command", cmd, idx: idx++ });
    for (const text of recentSearches) list.push({ kind: "recent", text, idx: idx++ });
    return list;
  }, [mode, cleanQuery, results, recentSearches]);

  // Auto-scroll focused item
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedIdx]);

  const open = useCallback(() => {
    setIsOpen(true);
    setRecentSearches(readRecent());
    setHasError(false);
    setTimeout(() => inputRef.current?.focus(), 20);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setFocusedIdx(0);
    setHasError(false);
    abortCtrl.current?.abort();
  }, []);

  // Ctrl/Cmd+K
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

  // Fetch search
  useEffect(() => {
    if (!isOpen || mode === "commands" || cleanQuery.length < 2) {
      setResults([]);
      setHasError(false);
      return;
    }

    if (debounceT.current) clearTimeout(debounceT.current);
    abortCtrl.current?.abort();

    debounceT.current = setTimeout(async () => {
      abortCtrl.current = new AbortController();
      setIsLoading(true);
      setHasError(false);

      const modules = modeModules(mode);
      const mParam = modules.length ? `&modules=${modules.join(",")}` : "";
      const url = `/api/search?q=${encodeURIComponent(cleanQuery)}${mParam}&page=1`;

      try {
        const res = await fetch(url, { signal: abortCtrl.current.signal });
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as SearchResults;
        setResults(data.items.slice(0, MAX_RESULTS));
        setFocusedIdx(0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setHasError(true);
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => { if (debounceT.current) clearTimeout(debounceT.current); };
  }, [cleanQuery, mode, isOpen]);

  // Execute item
  const execute = useCallback((item: FlatItem) => {
    if (item.kind === "result") {
      if (cleanQuery.length >= 2) setRecentSearches((p) => pushRecent(cleanQuery, p));
      router.push(item.item.href as Route);
      close();
    } else if (item.kind === "command") {
      if (item.cmd.href) router.push(item.cmd.href as Route);
      else if (item.cmd.action) item.cmd.action();
      close();
    } else {
      setQuery(item.text);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [cleanQuery, router, close]);

  // Keyboard nav
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

  // Group results by module
  const grouped = useMemo(() => {
    const map = new Map<SearchModule, SearchResultItem[]>();
    for (const item of results) {
      if (!map.has(item.module)) map.set(item.module, []);
      map.get(item.module)!.push(item);
    }
    return map;
  }, [results]);

  // Per-group flat-index offset
  const groupOffsets = useMemo(() => {
    const m = new Map<SearchModule, number>();
    let offset = 0;
    for (const [mod, items] of grouped.entries()) {
      m.set(mod, offset);
      offset += items.length;
    }
    return m;
  }, [grouped]);

  // ── Trigger button ─────────────────────────────────────────────────────

  if (!isOpen) {
    return (
      <button
        onClick={open}
        aria-label="Открыть поиск (Ctrl+K)"
        className={cn(
          "flex items-center gap-2.5 h-9 px-3 rounded-lg",
          "bg-muted/50 border border-border/80",
          "text-sm text-muted-foreground",
          "hover:bg-muted hover:text-foreground hover:border-border",
          "transition-all focus:outline-none focus:ring-2 focus:ring-ring"
        )}
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline text-[13px]">Поиск...</span>
        <div className="hidden sm:flex items-center gap-0.5 ml-1">
          <kbd className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border border-border bg-background text-muted-foreground leading-none">⌘</kbd>
          <kbd className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border border-border bg-background text-muted-foreground leading-none">K</kbd>
        </div>
      </button>
    );
  }

  // ── Palette ────────────────────────────────────────────────────────────

  const activePrefixHint = prefixChar && query.length === 1 ? PREFIX_HINTS[prefixChar] : null;
  const isSearching = mode !== "commands" && cleanQuery.length >= 2;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
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
          "w-full max-w-xl mx-4",
          "bg-popover border border-border rounded-2xl shadow-2xl",
          "flex flex-col overflow-hidden",
          "max-h-[80vh]",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-top-3 duration-150"
        )}
      >
        {/* ── Input ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border shrink-0">
          <div className="shrink-0 w-5 flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            ) : isSearching ? (
              <Search className="w-4 h-4 text-primary" />
            ) : (
              <Search className="w-4 h-4 text-muted-foreground" />
            )}
          </div>

          <input
            ref={inputRef}
            type="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setFocusedIdx(0); }}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === "commands"  ? "Команды и действия..."
              : mode === "personnel" ? "Поиск сотрудников..."
              : mode === "equipment" ? "Поиск техники..."
              : mode === "storage"   ? "Поиск носителей..."
              : "Поиск... (@сотрудники  #техника  ?носители  >команды)"
            }
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none"
          />

          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
              className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Очистить"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── Active prefix mode badge ─────────────────────────────── */}
        {activePrefixHint && (
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border-b border-border/60 shrink-0">
            <activePrefixHint.icon className={cn("w-3.5 h-3.5 shrink-0", activePrefixHint.color)} />
            <span className="text-xs text-muted-foreground">{activePrefixHint.text}</span>
          </div>
        )}

        {/* ── Results / Content ────────────────────────────────────── */}
        <div
          ref={listRef}
          role="listbox"
          className="flex-1 overflow-y-auto overscroll-contain py-1.5 px-1.5 space-y-0"
        >

          {/* COMMAND MODE */}
          {mode === "commands" && (() => {
            const navItems = flatItems.filter((x): x is FlatItem & { kind: "command" } => x.kind === "command" && x.cmd.section === "nav");
            const createItems = flatItems.filter((x): x is FlatItem & { kind: "command" } => x.kind === "command" && x.cmd.section === "create");

            if (flatItems.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-10 gap-1.5">
                  <HelpCircle className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Команды не найдены</p>
                </div>
              );
            }

            return (
              <>
                {navItems.length > 0 && (
                  <>
                    <SectionLabel>Навигация</SectionLabel>
                    {navItems.map((x) => (
                      <CommandRow key={x.cmd.id} cmd={x.cmd} focused={x.idx === focusedIdx} onClick={() => execute(x)} />
                    ))}
                  </>
                )}
                {createItems.length > 0 && (
                  <>
                    {navItems.length > 0 && <Divider />}
                    <SectionLabel>Создать</SectionLabel>
                    {createItems.map((x) => (
                      <CommandRow key={x.cmd.id} cmd={x.cmd} focused={x.idx === focusedIdx} onClick={() => execute(x)} />
                    ))}
                  </>
                )}
              </>
            );
          })()}

          {/* ACTIVE SEARCH */}
          {isSearching && (() => {
            if (isLoading) {
              return (
                <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Поиск...</span>
                </div>
              );
            }

            if (hasError) {
              return (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <AlertCircle className="w-8 h-8 text-destructive/50" />
                  <p className="text-sm text-muted-foreground">Ошибка поиска. Попробуйте ещё раз.</p>
                </div>
              );
            }

            if (grouped.size === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Search className="w-8 h-8 text-muted-foreground/20" />
                  <p className="text-sm font-medium text-foreground">Ничего не найдено</p>
                  <p className="text-xs text-muted-foreground">
                    Попробуйте другой запрос или{" "}
                    <button
                      type="button"
                      className="text-primary underline underline-offset-2 hover:no-underline"
                      onClick={() => {
                        router.push(`/search?q=${encodeURIComponent(cleanQuery)}` as Route);
                        close();
                      }}
                    >
                      расширенный поиск
                    </button>
                  </p>
                </div>
              );
            }

            return (
              <>
                {[...grouped.entries()].map(([mod, items], groupIdx) => {
                  const offset = groupOffsets.get(mod) ?? 0;
                  return (
                    <div key={mod}>
                      {groupIdx > 0 && <Divider />}
                      <ModuleGroupHeader module={mod} count={items.length} />
                      {items.map((item, i) => (
                        <ResultRow
                          key={item.id}
                          item={item}
                          focused={offset + i === focusedIdx}
                          onClick={() => execute({ kind: "result", item, idx: offset + i })}
                        />
                      ))}
                    </div>
                  );
                })}
              </>
            );
          })()}

          {/* IDLE STATE */}
          {!isSearching && mode !== "commands" && (() => {
            const navItems    = flatItems.filter((x): x is FlatItem & { kind: "command" } => x.kind === "command" && x.cmd.section === "nav");
            const createItems = flatItems.filter((x): x is FlatItem & { kind: "command" } => x.kind === "command" && x.cmd.section === "create");
            const recentItems = flatItems.filter((x): x is FlatItem & { kind: "recent" } => x.kind === "recent");

            return (
              <>
                <SectionLabel>Перейти</SectionLabel>
                {navItems.map((x) => (
                  <CommandRow key={x.cmd.id} cmd={x.cmd} focused={x.idx === focusedIdx} onClick={() => execute(x)} />
                ))}

                <Divider />
                <SectionLabel>Создать</SectionLabel>
                {createItems.map((x) => (
                  <CommandRow key={x.cmd.id} cmd={x.cmd} focused={x.idx === focusedIdx} onClick={() => execute(x)} />
                ))}

                {recentItems.length > 0 && (
                  <>
                    <Divider />
                    <SectionLabel>Недавние запросы</SectionLabel>
                    {recentItems.map((x) => (
                      <button
                        key={x.text}
                        type="button"
                        role="option"
                        aria-selected={x.idx === focusedIdx}
                        onClick={() => execute(x)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-100",
                          x.idx === focusedIdx
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted/70 text-foreground"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          x.idx === focusedIdx ? "bg-white/20" : "bg-muted"
                        )}>
                          <Clock className={cn("w-4 h-4", x.idx === focusedIdx ? "text-primary-foreground" : "text-muted-foreground")} />
                        </div>
                        <span className={cn("text-sm flex-1 truncate", x.idx === focusedIdx ? "text-primary-foreground" : "text-foreground")}>
                          {x.text}
                        </span>
                        <ChevronRight className={cn(
                          "w-3.5 h-3.5 shrink-0",
                          x.idx === focusedIdx ? "opacity-60 text-primary-foreground" : "opacity-0"
                        )} />
                      </button>
                    ))}
                  </>
                )}
              </>
            );
          })()}
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/20 shrink-0">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
            {[["↑↓", "навигация"], ["↵", "выбрать"], ["Esc", "закрыть"]].map(([key, label]) => (
              <span key={key} className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border/80 font-mono text-[10px] text-muted-foreground">
                  {key}
                </kbd>
                <span>{label}</span>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            {isSearching && (
              <button
                type="button"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
                onClick={() => {
                  setRecentSearches((p) => pushRecent(cleanQuery, p));
                  router.push(`/search?q=${encodeURIComponent(cleanQuery)}` as Route);
                  close();
                }}
              >
                Все результаты
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            {!isSearching && (
              <span className="font-mono tracking-wide">@ · # · ? · &gt;</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}