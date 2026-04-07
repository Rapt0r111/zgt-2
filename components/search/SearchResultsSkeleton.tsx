/**
 * SearchEmptyState — shown when there's no query or no results
 */

import { Search, FileSearch } from "lucide-react";

type EmptyStateType = "idle" | "no-results";

interface SearchEmptyStateProps {
  state: EmptyStateType;
  query?: string;
}

export function SearchEmptyState({ state, query }: SearchEmptyStateProps) {
  if (state === "idle") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Search className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">
          Начните вводить запрос
        </p>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          Поиск работает по ФИО, личному номеру, инвентарному номеру, серийному
          номеру, IMEI, должности и другим полям
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <FileSearch className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">
        Ничего не найдено по запросу{" "}
        <span className="font-semibold">«{query}»</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground max-w-sm">
        Попробуйте изменить запрос или снять фильтры по разделам
      </p>
    </div>
  );
}

/**
 * SearchResultsSkeleton — shown while Suspense boundary is pending
 */
export function SearchResultsSkeleton() {
  return (
    <div className="space-y-1 animate-pulse" aria-label="Загрузка результатов...">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-4 p-4 rounded-lg"
        >
          <div className="w-8 h-8 rounded-md bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-2/5" />
            <div className="h-3 bg-muted rounded w-1/4" />
            <div className="h-3 bg-muted rounded w-3/5" />
          </div>
          <div className="h-5 bg-muted rounded-full w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}