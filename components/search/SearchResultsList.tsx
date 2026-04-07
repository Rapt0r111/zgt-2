/**
 * SearchResultsList — displays ranked results from all modules
 */

import Link from "next/link";
import { Users, Smartphone, Monitor, Shield, Clock } from "lucide-react";
import type { SearchResults, SearchResultItem, SearchModule } from "@/types/search";
import { MODULE_LABELS } from "@/types/search";
import { cn } from "@/lib/utils";

// ── Module icon map ──────────────────────────────────────────────────────────

const MODULE_ICON_COMPONENTS: Record<SearchModule, React.ComponentType<{ className?: string }>> = {
  personnel: Users,
  phones: Smartphone,
  equipment: Monitor,
  storage_items: Shield,
};

const MODULE_COLORS: Record<SearchModule, string> = {
  personnel: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  phones: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  equipment: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  storage_items: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

// ── Badge variant styles ─────────────────────────────────────────────────────

const BADGE_STYLES: Record<string, string> = {
  default: "bg-primary/10 text-primary",
  secondary: "bg-muted text-muted-foreground",
  destructive: "bg-destructive/10 text-destructive",
  outline: "border border-border text-muted-foreground",
};

// ── Result Item ──────────────────────────────────────────────────────────────

function ResultItem({ item }: { item: SearchResultItem }) {
  const Icon = MODULE_ICON_COMPONENTS[item.module];

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-start gap-4 p-4 rounded-lg",
        "border border-transparent",
        "hover:border-border hover:bg-muted/50",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
        "transition-all"
      )}
    >
      {/* Module icon */}
      <div
        className={cn(
          "mt-0.5 flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center",
          MODULE_COLORS[item.module]
        )}
      >
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            {/* Title */}
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
              {item.title}
            </p>
            {/* Subtitle */}
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {item.subtitle}
            </p>
          </div>

          {/* Badge */}
          {item.badge && (
            <span
              className={cn(
                "flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium",
                BADGE_STYLES[item.badgeVariant ?? "secondary"]
              )}
            >
              {item.badge}
            </span>
          )}
        </div>

        {/* FTS highlight snippet */}
        {item.highlight && (
          <p
            className="mt-1.5 text-xs text-muted-foreground line-clamp-2"
            // ts_headline wraps matches in <mark> tags — safe since it's server-generated
            dangerouslySetInnerHTML={{ __html: item.highlight }}
          />
        )}
      </div>
    </Link>
  );
}

// ── Results grouped by module ────────────────────────────────────────────────

function ResultsGroup({
  module,
  items,
}: {
  module: SearchModule;
  items: SearchResultItem[];
}) {
  const Icon = MODULE_ICON_COMPONENTS[module];

  return (
    <section>
      <div className="flex items-center gap-2 mb-2 px-1">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {MODULE_LABELS[module]}
        </h2>
        <span className="text-xs text-muted-foreground">
          ({items.length})
        </span>
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <ResultItem key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

// ── Main list ────────────────────────────────────────────────────────────────

export function SearchResultsList({ results }: { results: SearchResults }) {
  // Group by module while preserving rank order within each group
  const grouped = results.items.reduce<Partial<Record<SearchModule, SearchResultItem[]>>>(
    (acc, item) => {
      if (!acc[item.module]) acc[item.module] = [];
      acc[item.module]!.push(item);
      return acc;
    },
    {}
  );

  const hasGrouped = Object.keys(grouped).length > 1;

  return (
    <div>
      {/* Meta info */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Найдено:{" "}
          <span className="font-medium text-foreground">
            {results.total} записей
          </span>
          {results.modules.length > 0 && (
            <> в {results.modules.map((m) => MODULE_LABELS[m]).join(", ")}</>
          )}
        </p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{results.took} мс</span>
        </div>
      </div>

      {/* Results — grouped view if multiple modules */}
      {hasGrouped ? (
        <div className="space-y-6">
          {(Object.entries(grouped) as [SearchModule, SearchResultItem[]][]).map(
            ([module, items]) => (
              <ResultsGroup key={module} module={module} items={items} />
            )
          )}
        </div>
      ) : (
        // Flat list for single-module results
        <div className="space-y-1">
          {results.items.map((item) => (
            <ResultItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}