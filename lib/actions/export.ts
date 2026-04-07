"use server";

/**
 * Excel Export — Server Action
 *
 * Returns a base64-encoded .xlsx file for any module.
 * Client triggers download via <a download> trick.
 *
 * Uses ExcelJS for rich formatting (merged cells, column widths, headers).
 */

import "server-only";
import ExcelJS from "exceljs";
import { db } from "@/db";
import {
  personnel,
  phones,
  equipment,
  storageItems,
} from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { requireRole } from "@/lib/auth.server";

export interface ExportResult {
  base64: string;
  filename: string;
  mimeType: string;
}

// ── Shared workbook styles ────────────────────────────────────────────────────
function applyHeaderStyle(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1D4ED8" }, // Tailwind blue-700
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFBFDBFE" } },
    };
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

// ── Personnel export ──────────────────────────────────────────────────────────
export async function exportPersonnelToExcel(): Promise<ExportResult> {
  await requireRole("officer");

  const rows = await db
    .select()
    .from(personnel)
    .where(isNull(personnel.deletedAt))
    .orderBy(personnel.rankPriority, personnel.lastName);

  const wb = new ExcelJS.Workbook();
  wb.creator = "ЗГТ Система";
  wb.created = new Date();

  const ws = wb.addWorksheet("Личный состав", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = [
    { header: "№", key: "num", width: 5 },
    { header: "Фамилия", key: "lastName" },
    { header: "Имя", key: "firstName" },
    { header: "Отчество", key: "middleName" },
    { header: "Личный номер", key: "personnelNumber" },
    { header: "Звание", key: "rank" },
    { header: "Должность", key: "position" },
    { header: "Подразделение", key: "unit" },
    { header: "Статус", key: "status" },
  ];

  applyHeaderStyle(ws.getRow(1));

  const statusMap: Record<string, string> = {
    active: "В строю",
    detached: "Командировка",
    hospital: "Госпиталь",
    leave: "Отпуск",
    dismissed: "Уволен",
  };

  rows.forEach((r, i) => {
    const row = ws.addRow({
      num: i + 1,
      lastName: r.lastName,
      firstName: r.firstName,
      middleName: r.middleName ?? "",
      personnelNumber: r.personnelNumber ?? "",
      rank: r.rank,
      position: r.position ?? "",
      unit: r.unit ?? "",
      status: statusMap[r.status] ?? r.status,
    });
    if (i % 2 === 0) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F9FF" },
      };
    }
  });

  autoWidth(ws);

  // Footer row with count
  const footerRow = ws.addRow([`Итого: ${rows.length} чел.`]);
  footerRow.getCell(1).font = { bold: true, italic: true };

  const buffer = await wb.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const date = new Date().toLocaleDateString("ru-RU").replace(/\./g, "-");

  return {
    base64,
    filename: `личный_состав_${date}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

// ── Phones checkin status export ──────────────────────────────────────────────
export async function exportPhonesToExcel(): Promise<ExportResult> {
  await requireRole("operator");

  const rows = await db
    .select({
      // phones
      model: phones.model,
      brand: phones.brand,
      imei1: phones.imei1,
      serialNumber: phones.serialNumber,
      status: phones.status,
      storageCell: phones.storageCell,
      hasCamera: phones.hasCamera,
      // personnel
      lastName: personnel.lastName,
      firstName: personnel.firstName,
      rank: personnel.rank,
    })
    .from(phones)
    .leftJoin(personnel, eq(phones.personnelId, personnel.id))
    .where(isNull(phones.deletedAt))
    .orderBy(personnel.lastName);

  const wb = new ExcelJS.Workbook();
  wb.creator = "ЗГТ Система";

  const ws = wb.addWorksheet("Телефоны", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = [
    { header: "№" },
    { header: "ФИО" },
    { header: "Звание" },
    { header: "Марка / Модель" },
    { header: "IMEI" },
    { header: "Серийный №" },
    { header: "Статус" },
    { header: "Ячейка хранения" },
    { header: "Камера" },
  ];

  applyHeaderStyle(ws.getRow(1));

  let notCheckedIn = 0;

  rows.forEach((r, i) => {
    if (r.status === "checked_out") notCheckedIn++;
    const row = ws.addRow([
      i + 1,
      `${r.lastName ?? ""} ${r.firstName ?? ""}`.trim(),
      r.rank ?? "",
      `${r.brand ?? ""} ${r.model}`.trim(),
      r.imei1 ?? "",
      r.serialNumber ?? "",
      r.status === "checked_in" ? "Сдан" : "Не сдан",
      r.storageCell ?? "",
      r.hasCamera ? "Да" : "Нет",
    ]);

    // Highlight not-checked-in rows
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
  const date = new Date().toLocaleDateString("ru-RU").replace(/\./g, "-");

  return {
    base64: Buffer.from(buffer).toString("base64"),
    filename: `телефоны_${date}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}
