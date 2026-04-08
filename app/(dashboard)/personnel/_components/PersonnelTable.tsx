/**
 * PersonnelTable — Server Component
 * Fetches data directly, renders the table.
 * Rows are clickable and link to the detail page.
 */

import Link from "next/link";
import type { Route } from "next";
import { ArrowUpDown, ArrowUp, ArrowDown, UserX } from "lucide-react";
import { getPersonnelList } from "@/lib/personnel.server";
import type { PersonnelRow } from "@/lib/personnel.server";
import { STATUS_MAP, PERSONNEL_PAGE_SIZE } from "@/types/personnel";
import type { PersonnelListParams, SortField, SortDir } from "@/types/personnel";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PersonnelRowActions } from "./PersonnelRowActions";
import { PersonnelTableClient } from "./PersonnelTableClient";
import { hasRole } from "@/lib/auth.server";

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status as keyof typeof STATUS_MAP];
  if (!s) return <span className="text-muted-foreground text-xs">—</span>;

  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    blue:    "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    amber:   "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    violet:  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    red:     "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
      colors[s.color] ?? "bg-muted text-muted-foreground"
    )}>
      {s.label}
    </span>
  );
}

// ── Avatar initials ────────────────────────────────────────────────────────────

function PersonnelAvatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${lastName[0] ?? ""}${firstName[0] ?? ""}`.toUpperCase();
  const hue = (lastName.charCodeAt(0) * 37 + firstName.charCodeAt(0) * 17) % 360;

  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
      style={{ backgroundColor: `hsl(${hue} 55% 48%)` }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

// ── Sort header cell ────────────────────────────────────────────────────────────

function SortableHeader({
  field, label, currentSort, currentDir, baseParams,
}: {
  field: SortField;
  label: string;
  currentSort: SortField;
  currentDir: SortDir;
  baseParams: Record<string, string>;
}) {
  const isActive = currentSort === field;
  const nextDir: SortDir = isActive && currentDir === "asc" ? "desc" : "asc";

  const params = new URLSearchParams({
    ...baseParams,
    sortBy: field,
    sortDir: nextDir,
    page: "1",
  });

  return (
    <Link
      href={`/personnel?${params.toString()}` as Route}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider",
        "hover:text-foreground transition-colors",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {label}
      {isActive ? (
        currentDir === "asc"
          ? <ArrowUp className="w-3 h-3" />
          : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </Link>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────────

function Pagination({
  page, pageCount, total, baseParams,
}: {
  page: number;
  pageCount: number;
  total: number;
  baseParams: Record<string, string>;
}) {
  if (pageCount <= 1) return null;

  const prevParams = new URLSearchParams({ ...baseParams, page: String(page - 1) });
  const nextParams = new URLSearchParams({ ...baseParams, page: String(page + 1) });

  const startItem = (page - 1) * PERSONNEL_PAGE_SIZE + 1;
  const endItem   = Math.min(page * PERSONNEL_PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between px-1 py-3">
      <p className="text-sm text-muted-foreground">
        {startItem}–{endItem} из {total}
      </p>
      <div className="flex items-center gap-1">
        <Link
          href={`/personnel?${prevParams.toString()}` as Route}
          aria-disabled={page <= 1}
          className={cn(
            "h-8 px-3 rounded-md text-sm border border-input",
            "flex items-center gap-1 transition-colors",
            page <= 1
              ? "pointer-events-none opacity-40"
              : "hover:bg-muted text-foreground"
          )}
        >
          ← Пред.
        </Link>
        <span className="text-sm text-muted-foreground px-2">
          {page} / {pageCount}
        </span>
        <Link
          href={`/personnel?${nextParams.toString()}` as Route}
          aria-disabled={page >= pageCount}
          className={cn(
            "h-8 px-3 rounded-md text-sm border border-input",
            "flex items-center gap-1 transition-colors",
            page >= pageCount
              ? "pointer-events-none opacity-40"
              : "hover:bg-muted text-foreground"
          )}
        >
          След. →
        </Link>
      </div>
    </div>
  );
}

// ── Main table ─────────────────────────────────────────────────────────────────

interface PersonnelTableProps extends PersonnelListParams {
  highlightId?: string;
}

export async function PersonnelTable({
  q,
  status,
  unit,
  rank,
  page = 1,
  sortBy = "lastName",
  sortDir = "asc",
  highlightId,
}: PersonnelTableProps) {
  const [result, canEdit, canDelete] = await Promise.all([
    getPersonnelList({ q, status, unit, rank, page, sortBy, sortDir }),
    hasRole("operator"),
    hasRole("admin"),
  ]);

  const baseParams: Record<string, string> = {};
  if (q)      baseParams.q      = q;
  if (status) baseParams.status = status;
  if (unit)   baseParams.unit   = unit;
  if (rank)   baseParams.rank   = rank;

  if (result.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <UserX className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">Нет записей</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          {q || status || unit || rank
            ? "Попробуйте изменить условия фильтрации"
            : "Добавьте первого сотрудника, нажав «Добавить»"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 sticky top-0 z-10">
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left w-8">
                <span className="sr-only">Аватар</span>
              </th>
              <th className="px-2 py-3 text-left">
                <SortableHeader field="lastName" label="ФИО" currentSort={sortBy} currentDir={sortDir} baseParams={baseParams} />
              </th>
              <th className="px-2 py-3 text-left">
                <SortableHeader field="rank" label="Звание" currentSort={sortBy} currentDir={sortDir} baseParams={baseParams} />
              </th>
              <th className="px-2 py-3 text-left hidden md:table-cell">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Должность</span>
              </th>
              <th className="px-2 py-3 text-left hidden lg:table-cell">
                <SortableHeader field="unit" label="Взвод" currentSort={sortBy} currentDir={sortDir} baseParams={baseParams} />
              </th>
              <th className="px-2 py-3 text-left">
                <SortableHeader field="status" label="Статус" currentSort={sortBy} currentDir={sortDir} baseParams={baseParams} />
              </th>
              <th className="px-2 py-3 text-left hidden xl:table-cell">
                <SortableHeader field="createdAt" label="Добавлен" currentSort={sortBy} currentDir={sortDir} baseParams={baseParams} />
              </th>
              <th className="px-4 py-3 w-8">
                <span className="sr-only">Действия</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.items.map((row) => (
              <PersonnelRow
                key={row.id}
                row={row}
                isHighlighted={row.id === highlightId}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        baseParams={baseParams}
      />
    </div>
  );
}

// ── Individual row ────────────────────────────────────────────────────────────

function PersonnelRow({
  row,
  isHighlighted,
  canEdit,
  canDelete,
}: {
  row: PersonnelRow;
  isHighlighted: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const fullName = `${row.lastName} ${row.firstName}${row.middleName ? ` ${row.middleName}` : ""}`;

  return (
    <tr
      id={`row-${row.id}`}
      className={cn(
        "group transition-colors hover:bg-muted/40",
        isHighlighted && "bg-primary/5 ring-1 ring-inset ring-primary/20"
      )}
    >
      {/* Avatar — links to detail */}
      <td className="pl-4 pr-2 py-3">
        <Link
          href={`/personnel/${row.id}` as Route}
          className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-full"
          tabIndex={-1}
          aria-hidden
        >
          <PersonnelAvatar firstName={row.firstName} lastName={row.lastName} />
        </Link>
      </td>

      {/* Name — links to detail */}
      <td className="px-2 py-3">
        <Link
          href={`/personnel/${row.id}` as Route}
          className={cn(
            "block group/link focus:outline-none",
            "rounded-sm focus:ring-2 focus:ring-ring"
          )}
        >
          <p className={cn(
            "font-medium leading-tight transition-colors",
            "text-foreground group-hover/link:text-primary"
          )}>
            {fullName}
          </p>
          {row.personnelNumber && (
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              {row.personnelNumber}
            </p>
          )}
        </Link>
      </td>

      <td className="px-2 py-3">
        <span className="text-foreground text-sm">{row.rank}</span>
      </td>

      <td className="px-2 py-3 hidden md:table-cell">
        <span className="text-muted-foreground text-sm">{row.position ?? "—"}</span>
      </td>

      <td className="px-2 py-3 hidden lg:table-cell">
        <span className="text-muted-foreground text-sm">{row.unit ?? "—"}</span>
      </td>

      <td className="px-2 py-3">
        <StatusBadge status={row.status} />
      </td>

      <td className="px-2 py-3 hidden xl:table-cell">
        <span className="text-muted-foreground text-xs tabular-nums">
          {formatDate(row.createdAt)}
        </span>
      </td>

      <td className="pl-2 pr-4 py-3">
        <PersonnelTableClient
          id={row.id}
          fullName={fullName}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </td>
    </tr>
  );
}