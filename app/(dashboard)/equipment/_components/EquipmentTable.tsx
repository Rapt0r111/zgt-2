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

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  emerald: { bg: "rgba(16,185,129,0.12)",  color: "#34D399", dot: "0 0 6px #34D399" },
  blue:    { bg: "rgba(59,130,246,0.12)",  color: "#60A5FA", dot: "" },
  amber:   { bg: "rgba(245,158,11,0.12)",  color: "#FCD34D", dot: "0 0 6px #FCD34D" },
  red:     { bg: "rgba(239,68,68,0.12)",   color: "#F87171", dot: "0 0 6px #F87171" },
};

function StatusBadge({ status }: { status: string }) {
  const s = EQUIPMENT_STATUS_MAP[status as keyof typeof EQUIPMENT_STATUS_MAP];
  if (!s) return <span style={{ color: "#4A5568", fontSize: "13px" }}>—</span>;

  const style = STATUS_STYLES[s.color] ?? { bg: "rgba(255,255,255,0.06)", color: "#94A3B8", dot: "" };

  return (
    <span
      className="inline-flex items-center gap-[5px] px-[9px] py-[3px] rounded-full text-[11px] font-medium"
      style={{ background: style.bg, color: style.color }}
    >
      <span
        className="w-[5px] h-[5px] rounded-full shrink-0"
        style={{
          background: style.color,
          boxShadow: style.dot || undefined,
        }}
      />
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
    <span className="text-xs" style={{ color: "#4A5568" }}>
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
      className="inline-flex items-center gap-1.5 transition-colors"
      style={{
        fontSize: "10.5px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.8px",
        color: isActive ? "#60A5FA" : "#4A5568",
      }}
    >
      {label}
      {isActive
        ? (currentDir === "asc"
            ? <ArrowUp className="w-3 h-3" />
            : <ArrowDown className="w-3 h-3" />)
        : <ArrowUpDown className="w-3 h-3 opacity-40" />}
    </Link>
  );
}

/* ── Pagination ───────────────────────────────────────────────────────────── */

function Pagination({ page, pageCount, total, baseParams }: {
  page: number; pageCount: number; total: number; baseParams: Record<string, string>;
}) {
  if (pageCount <= 1) return null;
  const prev = new URLSearchParams({ ...baseParams, page: String(page - 1) });
  const next = new URLSearchParams({ ...baseParams, page: String(page + 1) });
  const start = (page - 1) * EQUIPMENT_PAGE_SIZE + 1;
  const end   = Math.min(page * EQUIPMENT_PAGE_SIZE, total);

  const chipBase: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#4A5568",
    borderRadius: "8px",
    fontSize: "12px",
    height: "32px",
    padding: "0 12px",
    display: "inline-flex",
    alignItems: "center",
    transition: "all 0.15s",
  };

  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
    >
      <p className="text-xs tabular-nums" style={{ color: "#4A5568" }}>
        {start}–{end} из {total}
      </p>
      <div className="flex items-center gap-1.5">
        <Link
          href={`/equipment?${prev.toString()}` as Route}
          aria-disabled={page <= 1}
          className={cn(page <= 1 && "pointer-events-none opacity-30")}
          style={chipBase}
        >
          ← Пред.
        </Link>
        <span className="text-xs tabular-nums px-2" style={{ color: "#4A5568" }}>
          {page} / {pageCount}
        </span>
        <Link
          href={`/equipment?${next.toString()}` as Route}
          aria-disabled={page >= pageCount}
          className={cn(page >= pageCount && "pointer-events-none opacity-30")}
          style={chipBase}
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
      <div
        className="flex flex-col items-center justify-center py-20 text-center rounded-2xl animate-fade-up delay-2"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <MonitorX className="w-5 h-5" style={{ color: "#4A5568" }} />
        </div>
        <p className="text-sm font-medium" style={{ color: "#94A3B8" }}>Нет записей</p>
        <p className="text-xs mt-1 max-w-xs" style={{ color: "#4A5568" }}>
          {q || status || category || location
            ? "Попробуйте изменить условия фильтрации"
            : "Добавьте первое устройство, нажав «Добавить»"}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden animate-fade-up delay-2"
      style={{ border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead
            style={{
              background: "rgba(255,255,255,0.04)",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}
          >
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
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    color: "#4A5568",
                  }}
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

          <tbody>
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

function EquipmentRow({
  row, isHighlighted, canEdit, canDelete, animDelay,
}: {
  row: EquipmentRow; isHighlighted: boolean;
  canEdit: boolean; canDelete: boolean; animDelay: number;
}) {
  const specsParts: string[] = [];
  if (row.ramGb)     specsParts.push(`${row.ramGb} ГБ`);
  if (row.storageGb) specsParts.push(`${row.storageType ?? "HDD"} ${row.storageGb} ГБ`);
  if (row.os)        specsParts.push(row.os.replace("Windows ", "Win ").replace("Astra Linux", "Astra"));
  const specsLine = specsParts.join(" · ");

  const rowStyle: React.CSSProperties = {
    borderBottom: "1px solid rgba(255,255,255,0.03)",
    transition: "background 0.15s",
  };

  if (isHighlighted) {
    rowStyle.background = "rgba(59,130,246,0.06)";
    rowStyle.boxShadow  = "inset 2px 0 0 #3B82F6";
  }

  return (
    <tr
      id={`row-${row.id}`}
      className={cn("group", !isHighlighted && "hover:bg-[rgba(59,130,246,0.04)]")}
      style={rowStyle}
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
            <p
              className="font-medium leading-tight transition-colors"
              style={{ color: "#F0F4FF" }}
            >
              {row.displayName}
            </p>
            {row.status === "broken" && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{ background: "rgba(239,68,68,0.12)", color: "#F87171" }}
              >
                НЕИСПРАВНО
              </span>
            )}
            {row.status === "repair" && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{ background: "rgba(245,158,11,0.12)", color: "#FCD34D" }}
              >
                РЕМОНТ
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {row.manufacturer && (
              <span className="text-xs" style={{ color: "#4A5568" }}>{row.manufacturer}</span>
            )}
            {row.model && (
              <span className="text-xs" style={{ color: "#4A5568" }}>{row.model}</span>
            )}
          </div>
          {specsLine && (
            <p className="text-[11px] mt-0.5" style={{ color: "#4A5568" }}>
              {specsLine}
            </p>
          )}
        </Link>
      </td>

      {/* Inventory number */}
      <td className="px-2 py-3 hidden sm:table-cell">
        <div>
          <span
            className="text-sm font-mono"
            style={{ color: row.inventoryNumber ? "#94A3B8" : "#4A5568", fontSize: "12px", letterSpacing: "0.02em" }}
          >
            {row.inventoryNumber ?? "—"}
          </span>
          {row.serialNumber && (
            <p
              className="mt-0.5 truncate max-w-[110px] font-mono"
              style={{ fontSize: "11px", color: "#4A5568", letterSpacing: "0.02em" }}
            >
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
        <span className="text-xs" style={{ color: "#4A5568" }}>{row.location ?? "—"}</span>
      </td>

      {/* Owner */}
      <td className="px-2 py-3 hidden lg:table-cell">
        {row.personnelName ? (
          <div>
            <p className="text-[13px] font-medium leading-tight" style={{ color: "#94A3B8" }}>
              {row.personnelName}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#4A5568" }}>{row.personnelRank}</p>
          </div>
        ) : (
          <span className="text-xs italic" style={{ color: "#4A5568" }}>
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