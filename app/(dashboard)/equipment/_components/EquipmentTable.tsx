/**
 * EquipmentTable — Server Component
 * Sticky header, sortable columns, row selection (via client bridge)
 */

import Link from "next/link";
import type { Route } from "next";
import { ArrowUpDown, ArrowUp, ArrowDown, MonitorX } from "lucide-react";
import { getEquipmentList } from "@/lib/equipment.server";
import type { EquipmentRow } from "@/lib/equipment.server";
import {
  EQUIPMENT_STATUS_MAP,
  EQUIPMENT_PAGE_SIZE,
  DEVICE_TYPES,
} from "@/types/equipment";
import type { EquipmentListParams, EquipmentSortField, SortDir } from "@/types/equipment";
import { cn } from "@/lib/utils";
import { hasRole } from "@/lib/auth.server";
import { EquipmentTableClient } from "./EquipmentTableClient";

// ── Status badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = EQUIPMENT_STATUS_MAP[status as keyof typeof EQUIPMENT_STATUS_MAP];
  if (!s) return <span className="text-muted-foreground text-xs">—</span>;

  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    blue:    "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    amber:   "bg-amber-500/10 text-amber-600 dark:text-amber-400",
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

// ── Category badge ─────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {
    workstation: "ПЭВМ/АРМ",
    laptop:      "Ноутбук",
    server:      "Сервер",
    other:       "Прочее",
  };
  return (
    <span className="text-xs text-muted-foreground">
      {labels[category] ?? category}
    </span>
  );
}

// ── Sortable header ────────────────────────────────────────────────────────

function SortableHeader({
  field, label, currentSort, currentDir, baseParams,
}: {
  field: EquipmentSortField;
  label: string;
  currentSort: EquipmentSortField;
  currentDir: SortDir;
  baseParams: Record<string, string>;
}) {
  const isActive = currentSort === field;
  const nextDir: SortDir = isActive && currentDir === "asc" ? "desc" : "asc";

  const params = new URLSearchParams({ ...baseParams, sortBy: field, sortDir: nextDir, page: "1" });

  return (
    <Link
      href={`/equipment?${params.toString()}` as Route}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {label}
      {isActive
        ? (currentDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
        : <ArrowUpDown className="w-3 h-3 opacity-40" />}
    </Link>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────

function Pagination({ page, pageCount, total, baseParams }: {
  page: number; pageCount: number; total: number; baseParams: Record<string, string>;
}) {
  if (pageCount <= 1) return null;
  const prev = new URLSearchParams({ ...baseParams, page: String(page - 1) });
  const next = new URLSearchParams({ ...baseParams, page: String(page + 1) });
  const start = (page - 1) * EQUIPMENT_PAGE_SIZE + 1;
  const end   = Math.min(page * EQUIPMENT_PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between px-1 py-3">
      <p className="text-sm text-muted-foreground">{start}–{end} из {total}</p>
      <div className="flex items-center gap-1">
        <Link href={`/equipment?${prev.toString()}` as Route} aria-disabled={page <= 1}
          className={cn("h-8 px-3 rounded-md text-sm border border-input flex items-center transition-colors",
            page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-muted text-foreground"
          )}>← Пред.</Link>
        <span className="text-sm text-muted-foreground px-2">{page} / {pageCount}</span>
        <Link href={`/equipment?${next.toString()}` as Route} aria-disabled={page >= pageCount}
          className={cn("h-8 px-3 rounded-md text-sm border border-input flex items-center transition-colors",
            page >= pageCount ? "pointer-events-none opacity-40" : "hover:bg-muted text-foreground"
          )}>След. →</Link>
      </div>
    </div>
  );
}

// ── Main table ─────────────────────────────────────────────────────────────

interface EquipmentTableProps extends EquipmentListParams {
  highlightId?: string;
}

export async function EquipmentTable({
  q, status, category, location,
  page = 1, sortBy = "displayName", sortDir = "asc",
  highlightId,
}: EquipmentTableProps) {
  const [result, canEdit, canDelete] = await Promise.all([
    getEquipmentList({ q, status, category, location, page, sortBy, sortDir }),
    hasRole("operator"),
    hasRole("admin"),
  ]);

  const baseParams: Record<string, string> = {};
  if (q)        baseParams.q        = q;
  if (status)   baseParams.status   = status;
  if (category) baseParams.category = category;
  if (location) baseParams.location = location;

  if (result.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <MonitorX className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">Нет записей</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          {q || status || category || location
            ? "Попробуйте изменить условия фильтрации"
            : "Добавьте первое устройство, нажав «Добавить»"}
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
              {/* Checkbox placeholder — managed by client */}
              <th className="pl-4 pr-2 py-3 w-8">
                <span className="sr-only">Выбор</span>
              </th>
              <th className="px-2 py-3 text-left">
                <SortableHeader field="displayName" label="Устройство" currentSort={sortBy!} currentDir={sortDir!} baseParams={baseParams} />
              </th>
              <th className="px-2 py-3 text-left hidden sm:table-cell">
                <SortableHeader field="inventoryNumber" label="Инв. №" currentSort={sortBy!} currentDir={sortDir!} baseParams={baseParams} />
              </th>
              <th className="px-2 py-3 text-left hidden md:table-cell">
                <SortableHeader field="category" label="Тип" currentSort={sortBy!} currentDir={sortDir!} baseParams={baseParams} />
              </th>
              <th className="px-2 py-3 text-left hidden lg:table-cell">
                <SortableHeader field="location" label="Место" currentSort={sortBy!} currentDir={sortDir!} baseParams={baseParams} />
              </th>
              <th className="px-2 py-3 text-left hidden lg:table-cell">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Владелец</span>
              </th>
              <th className="px-2 py-3 text-left">
                <SortableHeader field="status" label="Статус" currentSort={sortBy!} currentDir={sortDir!} baseParams={baseParams} />
              </th>
              <th className="px-4 py-3 w-8">
                <span className="sr-only">Действия</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.items.map((row) => (
              <EquipmentRow
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

// ── Individual row ─────────────────────────────────────────────────────────

function EquipmentRow({
  row, isHighlighted, canEdit, canDelete,
}: {
  row: EquipmentRow; isHighlighted: boolean; canEdit: boolean; canDelete: boolean;
}) {
  // Compact specs line: RAM, storage, OS
  const specsParts: string[] = [];
  if (row.ramGb)    specsParts.push(`${row.ramGb} ГБ`);
  if (row.storageGb) specsParts.push(`${row.storageType ?? "HDD"} ${row.storageGb} ГБ`);
  if (row.os)       specsParts.push(row.os.replace("Windows ", "Win ").replace("Astra Linux", "Astra"));

  const specsLine = specsParts.join(" · ");

  return (
    <tr
      id={`row-${row.id}`}
      className={cn(
        "group transition-colors hover:bg-muted/40",
        isHighlighted && "bg-primary/5 ring-1 ring-inset ring-primary/20"
      )}
    >
      {/* Checkbox */}
      <td className="pl-4 pr-2 py-3">
        <EquipmentTableClient id={row.id} displayName={row.displayName}
          canEdit={canEdit} canDelete={canDelete} mode="checkbox" />
      </td>

      {/* Name + specs */}
      <td className="px-2 py-2.5">
        <Link href={`/equipment/${row.id}` as Route}
          className="block group/link focus:outline-none rounded-sm focus:ring-2 focus:ring-ring">
          <div className="flex items-center gap-2">
            <p className="font-medium leading-tight text-foreground group-hover/link:text-primary transition-colors">
              {row.displayName}
            </p>
            {row.status === "broken" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-medium border border-red-500/20">
                НЕИСПРАВНО
              </span>
            )}
            {row.status === "repair" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium border border-amber-500/20">
                РЕМОНТ
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {row.manufacturer && (
              <span className="text-xs text-muted-foreground">{row.manufacturer}</span>
            )}
            {row.model && (
              <span className="text-xs text-muted-foreground">{row.model}</span>
            )}
          </div>
          {specsLine && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">{specsLine}</p>
          )}
        </Link>
      </td>

      {/* Inventory number */}
      <td className="px-2 py-3 hidden sm:table-cell">
        <div>
          <span className={cn("text-sm font-mono",
            row.inventoryNumber ? "text-foreground" : "text-muted-foreground/50 text-xs")}>
            {row.inventoryNumber ?? "нет"}
          </span>
          {row.serialNumber && (
            <p className="text-xs text-muted-foreground/60 font-mono mt-0.5 truncate max-w-[110px]">
              {row.serialNumber}
            </p>
          )}
        </div>
      </td>

      {/* Category */}
      <td className="px-2 py-3 hidden md:table-cell">
        <CategoryBadge category={row.category} />
      </td>

      {/* Location */}
      <td className="px-2 py-3 hidden lg:table-cell">
        <span className="text-sm text-muted-foreground">{row.location ?? "—"}</span>
      </td>

      {/* Owner */}
      <td className="px-2 py-3 hidden lg:table-cell">
        {row.personnelName ? (
          <div>
            <p className="text-sm text-foreground font-medium leading-tight">{row.personnelName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{row.personnelRank}</p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/50 italic">не закреплено</span>
        )}
      </td>

      {/* Status */}
      <td className="px-2 py-3">
        <StatusBadge status={row.status} />
      </td>

      {/* Actions */}
      <td className="pl-2 pr-4 py-3">
        <EquipmentTableClient id={row.id} displayName={row.displayName}
          canEdit={canEdit} canDelete={canDelete} mode="actions" />
      </td>
    </tr>
  );
}