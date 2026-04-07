"use client";

/**
 * CommandPalette — Cmd+K global quick search
 *
 * Opens on Ctrl/Cmd+K or click on the search button in the header.
 * Debounces input, calls /api/search, shows top results inline.
 * "Enter" or result click navigates to the search page with full results.
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Loader2,
  Users,
  Smartphone,
  Monitor,
  Shield,
  ArrowRight,
} from "lucide-react";
import type { Route } from "next";
import type { SearchResults, SearchResultItem, SearchModule } from "@/types/search";
import { MODULE_LABELS } from "@/types/search";
import { cn } from "@/lib/utils";

// ── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ── Icon map ─────────────────────────────────────────────────────────────────
const ICONS: Record<SearchModule, React.ComponentType<{ className?: string }>> = {
  personnel: Users,
  phones: Smartphone,
  equipment: Monitor,
  storage_items: Shield,
};

// ── Mini result row ──────────────────────────────────────────────────────────
function MiniResult({
  item,
  isFocused,
  onClose,
}: {
  item: SearchResultItem;
  isFocused: boolean;
  onClose: () => void;
}) {
  const Icon = ICONS[item.module];

  return (
    <Link
      href={item.href as Route}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
        isFocused ? "bg-accent text-accent-foreground" : "hover:bg-muted"
      )}
    >
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="truncate font-medium">{item.title}</span>
        <span className="ml-2 text-xs text-muted-foreground truncate">
          {MODULE_LABELS[item.module]}
        </span>
      </div>
      {item.badge && (
        <span className="text-xs text-muted-foreground shrink-0">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// ── Main CommandPalette ──────────────────────────────────────────────────────
export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 200);

  // ── Open/close ─────────────────────────────────────────────────────────
  const open = useCallback(() => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 10);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setFocusedIndex(0);
  }, []);

  // ── Keyboard shortcut: Ctrl/Cmd+K ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        isOpen ? close() : open();
      }
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, open, close]);

  // ── Fetch results on debounced query ───────────────────────────────────
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&page=1`)
      .then((r) => r.json())
      .then((data: SearchResults) => {
        if (!cancelled) {
          setResults(data.items.slice(0, 8)); // Show top 8 in palette
          setFocusedIndex(0);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // ── Keyboard navigation within results ─────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[focusedIndex]) {
        router.push(results[focusedIndex].href as Route);
        close();
      } else if (query.trim().length >= 2) {
        // No focused item — go to full search page
        router.push(`/search?q=${encodeURIComponent(query)}` as Route);
        close();
      }
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={open}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md",
          "bg-muted/50 border border-border",
          "text-sm text-muted-foreground",
          "hover:bg-muted transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring"
        )}
        aria-label="Открыть поиск (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Поиск</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-xs border border-border rounded px-1 py-0.5">
          <span>⌘</span>K
        </kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={close}
        aria-hidden
      />

      {/* Palette */}
      <div
        className={cn(
          "fixed left-1/2 top-[15%] -translate-x-1/2 z-50",
          "w-full max-w-xl mx-4",
          "bg-background border border-border rounded-xl shadow-2xl",
          "overflow-hidden"
        )}
        role="dialog"
        aria-label="Быстрый поиск"
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Поиск по всей системе..."
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="text-xs text-muted-foreground border border-border rounded px-1">
            Esc
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="py-1 max-h-80 overflow-y-auto">
            {results.map((item, i) => (
              <MiniResult
                key={item.id}
                item={item}
                isFocused={i === focusedIndex}
                onClose={close}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        {query.trim().length >= 2 && (
          <div className="border-t border-border px-4 py-2">
            <Link
              href={`/search?q=${encodeURIComponent(query)}` as Route}
              onClick={close}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Показать все результаты для «{query}»</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Empty */}
        {query.trim().length >= 2 && !isLoading && results.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Ничего не найдено
          </div>
        )}
      </div>
    </>
  );
}