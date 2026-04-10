/**
 * EquipmentTable — Aurora redesign (Server Component)
 */

import Link from "next/link";
import type { Route } from "next";
import { ArrowUpDown, ArrowUp, ArrowDown, MonitorX } from "lucide-react";
import { getEquipmentList } from "@/lib/equipment.server";
import type { EquipmentRow } from "@/lib/equipment.server";
import { EQUIPMENT_STATUS_MAP, EQUIPMENT_PAGE_SIZE } from "@/types/equipment";
import type { EquipmentListParams, EquipmentSortField, SortDir } from "@/types/equipment";
import { cn } from "@/lib/utils";
import { hasRole } from "@/lib/auth.server";
import { EquipmentTableClient } from "./EquipmentTableClient";

/* ── Status badge ─────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const s = EQUIPMENT_STATUS_MAP[status as keyof typeof EQUIPMENT_STATUS_MAP];
  if (!s) return <span className="text-muted-foreground text-xs">—</span>;

  const styles: Record<string, React.CSSProperties> = {
    emerald: {
      background: "hsl(160 84% 55% / 0.12)",
      color: "hsl(160 84% 60%)",
    },
    blue: {
      background: "hsl(213 100% 68% / 0.12)",
      color: "hsl(213 100% 68%)",
    },
    amber: {
      background: "hsl(38 92% 68% / 0.12)",
      color: "hsl(38 92% 72%)",
    },
    red: {
      background: "hsl(0 72% 60% / 0.12)",
      color: "hsl(0 72% 72%)",
    },
  };

  return (
    <span
      className="status-pill"
      style={styles[s.color] ?? { background: "hsl(220 30% 13%)", color: "hsl(215 16% 60%)" }}
    >
      {s.label}
    </span>
  );
}

/* ── Category badge ───────────────────────────────────────────────────────── */

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

/* ── Sortable header ──────────────────────────────────────────────────────── */

function SortableHeader({
  field, label, currentSort, currentDir, baseParams,
}: {
  field: EquipmentSortField; label: string;
  currentSort: EquipmentSortField; currentDir: SortDir;
  baseParams: Record<string, string>;
}) {
  const isActive = currentSort === field;
  const nextDir: SortDir = isActive && currentDir === "asc" ? "desc" : "asc";
  const params = new URLSearchParams({ ...baseParams, sortBy: field, sortDir: nextDir, page: "1" });

  return (
    <Link
      href={`/equipment?${params.toString()}` as Route}
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-600 uppercase tracking-widest transition-colors",
        isActive
          ? "text-[hsl(213_100%_68%)]"
          : "text-muted-foreground hover:text-[hsl(220_50%_80%)]"
      )}
      style={{ fontWeight: 600 }}
    >
      {label}
      {isActive
        ? (currentDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
        : <ArrowUpDown className="w-3 h-3 opacity-30" />}
    </Link>
  );
}

/* ── Pagination ───────────────────────────────────────────────────────────── */

function Pagination({ page, pageCount, total, baseParams }: {
  page: number; pageCount: number; total: number; baseParams: Record<string, string>;
}) {
  if (pageCount <= 1) return null;
  const prev  = new URLSearchParams({ ...baseParams, page: String(page - 1) });
  const next  = new URLSearchParams({ ...baseParams, page: String(page + 1) });
  const start = (page - 1) * EQUIPMENT_PAGE_SIZE + 1;
  const end   = Math.min(page * EQUIPMENT_PAGE_SIZE, total);

  const chipStyle: React.CSSProperties = {
    background: "hsl(220 30% 11%)",
    border: "1px solid hsl(220 30% 16%)",
    color: "hsl(215 16% 55%)",
    borderRadius: "8px",
  };
  const chipActiveStyle: React.CSSProperties = {
    ...chipStyle,
    background: "hsl(217 91% 60% / 0.12)",
    borderColor: "hsl(217 91% 60% / 0.3)",
    color: "hsl(213 100% 68%)",
  };

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-xs text-muted-foreground">
        {start}–{end} из {total}
      </p>
      <div className="flex items-center gap-1">
        <Link
          href={`/equipment?${prev.toString()}` as Route}
          aria-disabled={page <= 1}
          className={cn("h-8 px-3 text-xs flex items-center transition-all",
            page <= 1 && "pointer-events-none opacity-30"
          )}
          style={chipStyle}
        >
          ← Пред.
        </Link>
        <span className="text-xs text-muted-foreground px-2 tabular-nums">
          {page} / {pageCount}
        </span>
        <Link
          href={`/equipment?${next.toString()}` as Route}
          aria-disabled={page >= pageCount}
          className={cn("h-8 px-3 text-xs flex items-center transition-all",
            page >= pageCount && "pointer-events-none opacity-30"
          )}
          style={chipStyle}
        >
          След. →
        </Link>
      </div>
    </div>
  );
}

/* ── Main table ───────────────────────────────────────────────────────────── */

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
      <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-2xl">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
          style={{ background: "hsl(220 30% 11%)" }}
        >
          <MonitorX className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Нет записей</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          {q || status || category || location
            ? "Попробуйте изменить условия фильтрации"
            : "Добавьте первое устройство, нажав «Добавить»"}
        </p>
      </div>
    );
  }

  const theadStyle: React.CSSProperties = {
    background: "hsl(220 38% 10%)",
    borderBottom: "1px solid hsl(220 30% 14%)",
  };

  return (
    <div
      className="rounded-2xl overflow-hidden animate-fade-up delay-2"
      style={{ border: "1px solid hsl(220 30% 12%)" }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={theadStyle}>
            <tr>
              <th className="pl-4 pr-2 py-3 w-8">
                <span className="sr-only">Выбор</span>
              </th>
              <th className="px-2 py-3 text-left">
                <SortableHeader field="displayName" label="Устройство"
                  currentSort={sortBy!} currentDir={sortDir!} baseParams={baseParams} />
              </th>
              <th className="px-2 py-3 text-left hidden sm:table-cell">
                <SortableHeader field="inventoryNumber" label="Инв. №"
                  currentSort={sortBy!} currentDir={sortDir!} baseParams={baseParams} />
              </th>
              <th className="px-2 py-3 text-left hidden md:table-cell">
                <SortableHeader field="category" label="Тип"
                  currentSort={sortBy!} currentDir={sortDir!} baseParams={baseParams} />
              </th>
              <th className="px-2 py-3 text-left hidden lg:table-cell">
                <SortableHeader field="location" label="Место"
                  currentSort={sortBy!} currentDir={sortDir!} baseParams={baseParams} />
              </th>
              <th className="px-2 py-3 text-left hidden lg:table-cell">
                <span className="text-[10px] font-600 uppercase tracking-widest text-muted-foreground"
                  style={{ fontWeight: 600 }}
                >
                  Владелец
                </span>
              </th>
              <th className="px-2 py-3 text-left">
                <SortableHeader field="status" label="Статус"
                  currentSort={sortBy!} currentDir={sortDir!} baseParams={baseParams} />
              </th>
              <th className="px-4 py-3 w-8">
                <span className="sr-only">Действия</span>
              </th>
            </tr>
          </thead>
          <tbody style={{ borderColor: "hsl(220 30% 11%)" }}>
            {result.items.map((row, i) => (
              <EquipmentRow
                key={row.id}
                row={row}
                isHighlighted={row.id === highlightId}
                canEdit={canEdit}
                canDelete={canDelete}
                animDelay={i * 0.02}
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

/* ── Individual row ───────────────────────────────────────────────────────── */

/* ── Individual row ───────────────────────────────────────────────────────── */

function EquipmentRow({
  row, isHighlighted, canEdit, canDelete, animDelay,
}: {
  row: EquipmentRow; isHighlighted: boolean;
  canEdit: boolean; canDelete: boolean; animDelay: number;
}) {
  const specsParts: string[] = [];
  if (row.ramGb)    specsParts.push(`${row.ramGb} ГБ`);
  if (row.storageGb) specsParts.push(`${row.storageType ?? "HDD"} ${row.storageGb} ГБ`);
  if (row.os)       specsParts.push(row.os.replace("Windows ", "Win ").replace("Astra Linux", "Astra"));
  const specsLine = specsParts.join(" · ");

  const rowStyle: React.CSSProperties = {
    borderBottom: "1px solid hsl(220 30% 10%)",
    transition: "background 0.15s",
  };
  if (isHighlighted) {
    rowStyle.background = "hsl(217 91% 60% / 0.06)";
    rowStyle.boxShadow  = "inset 2px 0 0 hsl(217 91% 60%)";
  }

  return (
    <tr
      id={`row-${row.id}`}
      // Добавляем hover-эффект через Tailwind, если строка не выделена
      className={cn(
        "group",
        !isHighlighted && "hover:bg-[hsl(220_40%_8%/0.8)]"
      )}
      style={rowStyle}
      // УДАЛЯЕМ onMouseEnter и onMouseLeave
    >
      {/* Checkbox */}
      <td className="pl-4 pr-2 py-3">
        <EquipmentTableClient
          id={row.id}
          displayName={row.displayName}
          canEdit={canEdit}
          canDelete={canDelete}
          mode="checkbox"
        />
      </td>

      {/* Name + specs */}
      <td className="px-2 py-2.5">
        <Link
          href={`/equipment/${row.id}` as Route}
          className="block focus:outline-none rounded-sm"
        >
          <div className="flex items-center gap-2">
            <p className="font-500 leading-tight text-[hsl(220_50%_92%)] transition-colors group-hover:text-[hsl(213_100%_72%)]"
              style={{ fontWeight: 500 }}
            >
              {row.displayName}
            </p>
            {row.status === "broken" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-500"
                style={{
                  background: "hsl(0 72% 60% / 0.12)",
                  color: "hsl(0 72% 72%)",
                  fontWeight: 500,
                }}
              >
                НЕИСПРАВНО
              </span>
            )}
            {row.status === "repair" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-500"
                style={{
                  background: "hsl(38 92% 68% / 0.12)",
                  color: "hsl(38 92% 72%)",
                  fontWeight: 500,
                }}
              >
                РЕМОНТ
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {row.manufacturer && (
              <span className="text-xs text-muted-foreground">{row.manufacturer}</span>
            )}
            {row.model && (
              <span className="text-xs text-muted-foreground">{row.model}</span>
            )}
          </div>
          {specsLine && (
            <p className="text-[11px] mt-0.5" style={{ color: "hsl(215 16% 35%)" }}>
              {specsLine}
            </p>
          )}
        </Link>
      </td>

      {/* Inventory number */}
      <td className="px-2 py-3 hidden sm:table-cell">
        <div>
          <span
            className="text-sm text-mono-id"
            style={row.inventoryNumber ? { color: "hsl(220 50% 75%)" } : {}}
          >
            {row.inventoryNumber ?? "—"}
          </span>
          {row.serialNumber && (
            <p className="text-mono-id mt-0.5 truncate max-w-[110px]">
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
        <span className="text-xs text-muted-foreground">{row.location ?? "—"}</span>
      </td>

      {/* Owner */}
      <td className="px-2 py-3 hidden lg:table-cell">
        {row.personnelName ? (
          <div>
            <p className="text-[13px] font-500 leading-tight" style={{ fontWeight: 500, color: "hsl(220 50% 88%)" }}>
              {row.personnelName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{row.personnelRank}</p>
          </div>
        ) : (
          <span className="text-xs italic" style={{ color: "hsl(215 16% 30%)" }}>
            не закреплено
          </span>
        )}
      </td>

      {/* Status */}
      <td className="px-2 py-3">
        <StatusBadge status={row.status} />
      </td>

      {/* Actions */}
      <td className="pl-2 pr-4 py-3">
        <EquipmentTableClient
          id={row.id}
          displayName={row.displayName}
          canEdit={canEdit}
          canDelete={canDelete}
          mode="actions"
        />
      </td>
    </tr>
  );
}