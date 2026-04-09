"use server";

import "server-only";
import ExcelJS from "exceljs";
import { db } from "@/db";
import { personnel, phones, equipment, storageDevices } from "@/db/schema";
import { eq, isNull, ilike, or, and, asc, desc } from "drizzle-orm";
import { requireRole } from "@/lib/auth.server";
import type { PersonnelStatus } from "@/types/personnel";
import type { EquipmentStatus } from "@/types/equipment";

export interface ExportResult {
  base64:   string;
  filename: string;
  mimeType: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function applyHeaderStyle(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1D4ED8" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FFBFDBFE" } } };
  });
  row.height = 30;
}

function autoWidth(sheet: ExcelJS.Worksheet, minWidth = 10, maxWidth = 50) {
  sheet.columns.forEach((col) => {
    let maxLen = minWidth;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > maxLen) maxLen = Math.min(len + 2, maxWidth);
    });
    col.width = maxLen;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Personnel export
// ─────────────────────────────────────────────────────────────────────────────

export interface PersonnelExportFilters {
  q?:      string;
  status?: PersonnelStatus | "";
  unit?:   string;
  rank?:   string;
}

export async function exportPersonnelToExcel(
  filters: PersonnelExportFilters = {}
): Promise<ExportResult> {
  await requireRole("officer");

  const { q, status, unit, rank } = filters;

  const conditions = [isNull(personnel.deletedAt)];

  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(personnel.lastName,        term),
        ilike(personnel.firstName,       term),
        ilike(personnel.middleName,      term),
        ilike(personnel.personnelNumber, term),
        ilike(personnel.position,        term),
        ilike(personnel.unit,            term),
        ilike(personnel.rank,            term),
      )!
    );
  }
  if (status) conditions.push(eq(personnel.status, status));
  if (unit?.trim()) conditions.push(ilike(personnel.unit, `%${unit.trim()}%`));
  if (rank?.trim()) conditions.push(eq(personnel.rank, rank.trim()));

  const rows = await db
    .select()
    .from(personnel)
    .where(and(...conditions))
    .orderBy(asc(personnel.rankPriority), asc(personnel.lastName));

  const wb = new ExcelJS.Workbook();
  wb.creator = "ЗГТ Система";
  wb.created = new Date();

  const ws = wb.addWorksheet("Личный состав", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
    views:     [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = [
    { header: "№",             key: "num",             width: 5  },
    { header: "Фамилия",       key: "lastName"                   },
    { header: "Имя",           key: "firstName"                  },
    { header: "Отчество",      key: "middleName"                 },
    { header: "Личный №",      key: "personnelNumber"            },
    { header: "Звание",        key: "rank"                       },
    { header: "Должность",     key: "position"                   },
    { header: "Подразделение", key: "unit"                       },
    { header: "Статус",        key: "status"                     },
    { header: "Примечания",    key: "notes",           width: 30 },
    { header: "Добавлен",      key: "createdAt"                  },
  ];

  applyHeaderStyle(ws.getRow(1));

  const statusMap: Record<string, string> = {
    active:    "В строю",
    detached:  "Командировка",
    hospital:  "Госпиталь",
    leave:     "Отпуск",
    dismissed: "Уволен",
  };

  rows.forEach((r, i) => {
    const row = ws.addRow({
      num:             i + 1,
      lastName:        r.lastName,
      firstName:       r.firstName,
      middleName:      r.middleName      ?? "",
      personnelNumber: r.personnelNumber ?? "",
      rank:            r.rank,
      position:        r.position        ?? "",
      unit:            r.unit            ?? "",
      status:          statusMap[r.status] ?? r.status,
      notes:           r.notes           ?? "",
      createdAt:       r.createdAt.toLocaleDateString("ru-RU"),
    });
    if (i % 2 === 0) {
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F9FF" } };
    }
    if (r.status === "dismissed") {
      row.eachCell((cell) => { cell.font = { color: { argb: "FF9CA3AF" } }; });
    }
  });

  autoWidth(ws);

  ws.addRow([]);
  const summary: string[] = [`Итого: ${rows.length} чел.`];
  if (q)      summary.push(`Поиск: "${q}"`);
  if (status) summary.push(`Статус: ${statusMap[status] ?? status}`);
  if (unit)   summary.push(`Взвод: ${unit}`);
  if (rank)   summary.push(`Звание: ${rank}`);

  const footerRow = ws.addRow([summary.join("  ·  ")]);
  footerRow.getCell(1).font = { bold: true, italic: true, color: { argb: "FF6B7280" } };

  const buffer = await wb.xlsx.writeBuffer();
  const date   = new Date().toLocaleDateString("ru-RU").replace(/\./g, "-");

  return {
    base64:   Buffer.from(buffer).toString("base64"),
    filename: `личный_состав_${date}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phones export
// ─────────────────────────────────────────────────────────────────────────────

export async function exportPhonesToExcel(): Promise<ExportResult> {
  await requireRole("operator");

  const rows = await db
    .select({
      model:        phones.model,
      brand:        phones.brand,
      imei1:        phones.imei1,
      serialNumber: phones.serialNumber,
      status:       phones.status,
      storageCell:  phones.storageCell,
      hasCamera:    phones.hasCamera,
      lastName:     personnel.lastName,
      firstName:    personnel.firstName,
      rank:         personnel.rank,
    })
    .from(phones)
    .leftJoin(personnel, eq(phones.personnelId, personnel.id))
    .where(isNull(phones.deletedAt))
    .orderBy(asc(personnel.lastName));

  const wb = new ExcelJS.Workbook();
  wb.creator = "ЗГТ Система";

  const ws = wb.addWorksheet("Телефоны", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = [
    { header: "№"              },
    { header: "ФИО"            },
    { header: "Звание"         },
    { header: "Марка / Модель" },
    { header: "IMEI"           },
    { header: "Серийный №"     },
    { header: "Статус"         },
    { header: "Ячейка"         },
    { header: "Камера"         },
  ];

  applyHeaderStyle(ws.getRow(1));

  let notCheckedIn = 0;
  rows.forEach((r, i) => {
    if (r.status === "checked_out") notCheckedIn++;
    const row = ws.addRow([
      i + 1,
      `${r.lastName ?? ""} ${r.firstName ?? ""}`.trim(),
      r.rank         ?? "",
      `${r.brand ?? ""} ${r.model}`.trim(),
      r.imei1        ?? "",
      r.serialNumber ?? "",
      r.status === "checked_in" ? "Сдан" : "Не сдан",
      r.storageCell  ?? "",
      r.hasCamera ? "Да" : "Нет",
    ]);
    if (r.status === "checked_out") {
      row.getCell(7).font = { color: { argb: "FFDC2626" }, bold: true };
    }
  });

  ws.addRow([]);
  const summaryRow = ws.addRow([
    `Сдано: ${rows.length - notCheckedIn}  /  Не сдано: ${notCheckedIn}  /  Всего: ${rows.length}`,
  ]);
  summaryRow.getCell(1).font = { bold: true };

  autoWidth(ws);

  const buffer = await wb.xlsx.writeBuffer();
  const date   = new Date().toLocaleDateString("ru-RU").replace(/\./g, "-");

  return {
    base64:   Buffer.from(buffer).toString("base64"),
    filename: `телефоны_${date}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Equipment export  ← NEW
// ─────────────────────────────────────────────────────────────────────────────

export interface EquipmentExportFilters {
  q?:        string;
  status?:   EquipmentStatus | "";
  category?: string;
  location?: string;
}

export async function exportEquipmentToExcel(
  filters: EquipmentExportFilters = {}
): Promise<ExportResult> {
  await requireRole("operator");

  const { q, status, category, location } = filters;

  const conditions = [isNull(equipment.deletedAt), eq(equipment.isPersonal, false)];

  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(equipment.displayName,     term),
        ilike(equipment.inventoryNumber, term),
        ilike(equipment.serialNumber,    term),
        ilike(equipment.manufacturer,    term),
        ilike(equipment.model,           term),
        ilike(equipment.location,        term),
      )!
    );
  }
  if (status)   conditions.push(eq(equipment.status,   status   as EquipmentStatus));
  if (category) conditions.push(eq(equipment.category, category as "workstation" | "laptop" | "server" | "other"));
  if (location?.trim()) conditions.push(ilike(equipment.location, `%${location.trim()}%`));

  const rows = await db
    .select({
      id:              equipment.id,
      category:        equipment.category,
      displayName:     equipment.displayName,
      inventoryNumber: equipment.inventoryNumber,
      serialNumber:    equipment.serialNumber,
      mniSerialNumber: equipment.mniSerialNumber,
      manufacturer:    equipment.manufacturer,
      model:           equipment.model,
      cpu:             equipment.cpu,
      ramGb:           equipment.ramGb,
      storageType:     equipment.storageType,
      storageGb:       equipment.storageGb,
      os:              equipment.os,
      status:          equipment.status,
      location:        equipment.location,
      createdAt:       equipment.createdAt,
      // owner
      personnelLastName:  personnel.lastName,
      personnelFirstName: personnel.firstName,
      personnelRank:      personnel.rank,
    })
    .from(equipment)
    .leftJoin(personnel, eq(equipment.personnelId, personnel.id))
    .where(and(...conditions))
    .orderBy(asc(equipment.displayName));

  const wb = new ExcelJS.Workbook();
  wb.creator = "ЗГТ Система";
  wb.created = new Date();

  const ws = wb.addWorksheet("Техника", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
    views:     [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = [
    { header: "№",               key: "num",             width: 5  },
    { header: "Наименование",    key: "displayName",     width: 28 },
    { header: "Тип",             key: "category",        width: 12 },
    { header: "Инв. №",          key: "inventoryNumber", width: 14 },
    { header: "Серийный №",      key: "serialNumber",    width: 18 },
    { header: "Серийный № МНИ",  key: "mniSerialNumber", width: 18 },
    { header: "Производитель",   key: "manufacturer",    width: 14 },
    { header: "Модель",          key: "model",           width: 18 },
    { header: "CPU",             key: "cpu",             width: 20 },
    { header: "ОЗУ (ГБ)",        key: "ram",             width: 10 },
    { header: "Хранилище",       key: "storage",         width: 14 },
    { header: "ОС",              key: "os",              width: 18 },
    { header: "Статус",          key: "status",          width: 12 },
    { header: "Местоположение",  key: "location",        width: 18 },
    { header: "Ответственный",   key: "owner",           width: 22 },
    { header: "Добавлен",        key: "createdAt",       width: 12 },
  ];

  applyHeaderStyle(ws.getRow(1));

  const categoryLabels: Record<string, string> = {
    workstation: "ПЭВМ/АРМ",
    laptop:      "Ноутбук",
    server:      "Сервер",
    other:       "Прочее",
  };

  const statusLabels: Record<string, string> = {
    in_use:  "В работе",
    storage: "На складе",
    repair:  "В ремонте",
    broken:  "Сломан",
  };

  rows.forEach((r, i) => {
    const storageStr = [r.storageType, r.storageGb ? `${r.storageGb} ГБ` : ""]
      .filter(Boolean)
      .join(" ");

    const ownerStr = r.personnelLastName
      ? `${r.personnelRank ?? ""} ${r.personnelLastName} ${r.personnelFirstName ?? ""}`.trim()
      : "";

    const row = ws.addRow({
      num:             i + 1,
      displayName:     r.displayName,
      category:        categoryLabels[r.category]  ?? r.category,
      inventoryNumber: r.inventoryNumber            ?? "",
      serialNumber:    r.serialNumber               ?? "",
      mniSerialNumber: r.mniSerialNumber            ?? "",
      manufacturer:    r.manufacturer               ?? "",
      model:           r.model                      ?? "",
      cpu:             r.cpu                        ?? "",
      ram:             r.ramGb                      ?? "",
      storage:         storageStr,
      os:              r.os                         ?? "",
      status:          statusLabels[r.status]       ?? r.status,
      location:        r.location                   ?? "",
      owner:           ownerStr,
      createdAt:       r.createdAt.toLocaleDateString("ru-RU"),
    });

    // Colour-code rows by status
    if (r.status === "broken") {
      row.eachCell((cell) => { cell.font = { color: { argb: "FFDC2626" } }; });
    } else if (r.status === "repair") {
      row.getCell("status").font = { color: { argb: "FFD97706" }, bold: true };
    } else if (i % 2 === 0) {
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F9FF" } };
    }
  });

  autoWidth(ws);

  // Footer summary
  ws.addRow([]);
  const summary: string[] = [`Итого: ${rows.length} устройств`];
  if (q)        summary.push(`Поиск: "${q}"`);
  if (status)   summary.push(`Статус: ${statusLabels[status] ?? status}`);
  if (category) summary.push(`Тип: ${categoryLabels[category] ?? category}`);
  if (location) summary.push(`Место: ${location}`);

  const footerRow = ws.addRow([summary.join("  ·  ")]);
  footerRow.getCell(1).font = { bold: true, italic: true, color: { argb: "FF6B7280" } };

  const buffer = await wb.xlsx.writeBuffer();
  const date   = new Date().toLocaleDateString("ru-RU").replace(/\./g, "-");

  return {
    base64:   Buffer.from(buffer).toString("base64"),
    filename: `техника_${date}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}