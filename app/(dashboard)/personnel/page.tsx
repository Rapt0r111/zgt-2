/**
 * /personnel — Personnel Management Page
 *
 * Architecture:
 *   - Server Component reads searchParams, drives all data fetching
 *   - PersonnelStats / PersonnelTable are Server Components (Suspense-streamed)
 *   - PersonnelFilters is a Client Component (nuqs URL state)
 *   - PersonnelFormDrawer is a Client Component (Sheet with react-hook-form)
 *   - RBAC enforced server-side via hasRole()
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PersonnelFilters }    from "./_components/PersonnelFilters";
import { PersonnelTable }      from "./_components/PersonnelTable";
import { PersonnelStats }      from "./_components/PersonnelStats";
import { PersonnelFormDrawer } from "./_components/PersonnelFormDrawer";
import { ExportPersonnelButton } from "./_components/ExportButton";
import { getDistinctUnits }    from "@/lib/personnel.server";
import { hasRole }             from "@/lib/auth.server";
import type { SortField, SortDir, PersonnelStatus } from "@/types/personnel";
import { SORT_FIELDS }         from "@/types/personnel";

export const metadata: Metadata = {
  title: "Личный состав — ЗГТ",
};

// ── Skeleton placeholders ─────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
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
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
          <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-muted rounded w-2/5" />
            <div className="h-2.5 bg-muted rounded w-1/4" />
          </div>
          <div className="h-3.5 bg-muted rounded w-24 hidden md:block" />
          <div className="h-3.5 bg-muted rounded w-20 hidden md:block" />
          <div className="h-5 bg-muted rounded-full w-16" />
        </div>
      ))}
    </div>
  );
}

// ── Page props ────────────────────────────────────────────────────────────────

interface PersonnelPageProps {
  searchParams: Promise<{
    q?:         string;
    status?:    string;
    unit?:      string;
    page?:      string;
    sortBy?:    string;
    sortDir?:   string;
    highlight?: string;
  }>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PersonnelPage({ searchParams }: PersonnelPageProps) {
  const params = await searchParams;

  // Validate / sanitize URL params
  const q         = params.q?.trim() ?? "";
  const status    = (["active", "detached", "hospital", "leave", "dismissed"].includes(params.status ?? "")
    ? params.status
    : "") as PersonnelStatus | "";
  const unit      = params.unit ?? "";
  const page      = Math.max(1, Number(params.page ?? "1"));
  const sortBy    = (SORT_FIELDS.includes(params.sortBy as SortField)
    ? params.sortBy
    : "lastName") as SortField;
  const sortDir   = (params.sortDir === "desc" ? "desc" : "asc") as SortDir;
  const highlight = params.highlight;

  // Parallel-fetch config data + permissions
  const [units, canCreate] = await Promise.all([
    getDistinctUnits(),
    hasRole("operator"),
  ]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Личный состав</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Учёт и управление персоналом
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ExportPersonnelButton />
          <PersonnelFormDrawer canCreate={canCreate} />
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <Suspense fallback={<StatsSkeleton />}>
        <PersonnelStats />
      </Suspense>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <PersonnelFilters units={units} />

      {/* ── Table (streamed) ───────────────────────────────────────────────── */}
      <Suspense
        key={`${q}-${status}-${unit}-${page}-${sortBy}-${sortDir}`}
        fallback={<TableSkeleton />}
      >
        <PersonnelTable
          q={q}
          status={status}
          unit={unit}
          page={page}
          sortBy={sortBy}
          sortDir={sortDir}
          highlightId={highlight}
        />
      </Suspense>
    </div>
  );
}