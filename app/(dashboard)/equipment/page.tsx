/**
 * /equipment — Equipment Management Page
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import { Monitor } from "lucide-react";
import { EquipmentStats }        from "./_components/EquipmentStats";
import { EquipmentFilters }      from "./_components/EquipmentFilters";
import { EquipmentTable }        from "./_components/EquipmentTable";
import { EquipmentFormDrawer }   from "./_components/EquipmentFormDrawer";
import { EquipmentBatchToolbar } from "./_components/EquipmentBatchToolbar";
import { ExportEquipmentButton } from "./_components/ExportEquipmentButton";
import { getDistinctLocations }  from "@/lib/equipment.server";
import { hasRole }               from "@/lib/auth.server";
import type { EquipmentSortField, SortDir, EquipmentStatus } from "@/types/equipment";
import { EQUIPMENT_SORT_FIELDS } from "@/types/equipment";

export const metadata: Metadata = { title: "Вычислительная техника — ЗГТ" };

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 rounded-lg bg-muted" />
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-border overflow-hidden animate-pulse">
      <div className="h-11 bg-muted/40 border-b border-border" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0"
        >
          <div className="w-4 h-4 rounded bg-muted shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-muted rounded w-2/5" />
            <div className="h-2.5 bg-muted rounded w-1/4" />
          </div>
          <div className="h-3.5 bg-muted rounded w-20 hidden sm:block" />
          <div className="h-3.5 bg-muted rounded w-16 hidden md:block" />
          <div className="h-5 bg-muted rounded-full w-20" />
        </div>
      ))}
    </div>
  );
}

interface EquipmentPageProps {
  searchParams: Promise<{
    q?:         string;
    status?:    string;
    category?:  string;
    location?:  string;
    page?:      string;
    sortBy?:    string;
    sortDir?:   string;
    highlight?: string;
  }>;
}

export default async function EquipmentPage({ searchParams }: EquipmentPageProps) {
  const params = await searchParams;

  const q        = params.q?.trim() ?? "";
  const status   = (
    ["in_use", "storage", "repair", "broken"].includes(params.status ?? "")
      ? params.status
      : ""
  ) as EquipmentStatus | "";
  const category  = params.category ?? "";
  const location  = params.location ?? "";
  const page      = Math.max(1, Number(params.page ?? "1"));
  const sortBy    = (
    EQUIPMENT_SORT_FIELDS.includes(params.sortBy as EquipmentSortField)
      ? params.sortBy
      : "displayName"
  ) as EquipmentSortField;
  const sortDir   = (params.sortDir === "desc" ? "desc" : "asc") as SortDir;
  const highlight = params.highlight;

  const [locations, canCreate] = await Promise.all([
    getDistinctLocations(),
    hasRole("operator"),
  ]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Вычислительная техника
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Учёт и управление оборудованием
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export respects current URL filters — needs Suspense for useSearchParams */}
          <Suspense fallback={<div className="h-9 w-24 rounded-lg bg-muted animate-pulse" />}>
            <ExportEquipmentButton />
          </Suspense>
          <EquipmentFormDrawer canCreate={canCreate} />
        </div>
      </div>

      {/* Stats */}
      <Suspense fallback={<StatsSkeleton />}>
        <EquipmentStats />
      </Suspense>

      {/* Filters */}
      <EquipmentFilters locations={locations} />

      {/* Table */}
      <Suspense
        key={`${q}-${status}-${category}-${location}-${page}-${sortBy}-${sortDir}`}
        fallback={<TableSkeleton />}
      >
        <EquipmentTable
          q={q}
          status={status}
          category={category}
          location={location}
          page={page}
          sortBy={sortBy}
          sortDir={sortDir}
          highlightId={highlight}
        />
      </Suspense>

      {/* Batch toolbar — client only, appears when rows selected */}
      <EquipmentBatchToolbar />
    </div>
  );
}