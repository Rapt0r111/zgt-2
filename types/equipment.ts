/**
 * Equipment module — shared types, constants, Zod schemas
 */
import { z } from "zod";

// ── Device type (UI concept → maps to db category) ────────────────────────

export const DEVICE_TYPES = [
  { value: "pэвм",     label: "ПЭВМ",    category: "workstation" },
  { value: "arm",      label: "АРМ",     category: "workstation" },
  { value: "laptop",   label: "Ноутбук", category: "laptop"      },
  { value: "server",   label: "Сервер",  category: "server"      },
  { value: "other",    label: "Прочее",  category: "other"       },
] as const;

export type DeviceTypeValue = (typeof DEVICE_TYPES)[number]["value"];

export const DEVICE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DEVICE_TYPES.map((d) => [d.value, d.label])
);

// ── Status ─────────────────────────────────────────────────────────────────

export const EQUIPMENT_STATUSES = [
  { value: "in_use",  label: "В работе",   color: "emerald" },
  { value: "storage", label: "На складе",  color: "blue"    },
  { value: "repair",  label: "В ремонте",  color: "amber"   },
  { value: "broken",  label: "Сломан",     color: "red"     },
] as const;

export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number]["value"];

export const EQUIPMENT_STATUS_MAP = Object.fromEntries(
  EQUIPMENT_STATUSES.map((s) => [s.value, s])
) as Record<EquipmentStatus, (typeof EQUIPMENT_STATUSES)[number]>;

// ── Storage types ──────────────────────────────────────────────────────────

export const STORAGE_TYPES = ["HDD", "SSD", "NVMe", "eMMC"] as const;
export type StorageTypeValue = (typeof STORAGE_TYPES)[number];

// ── Transfer operation types ──────────────────────────────────────────────

export const TRANSFER_TYPES = [
  { value: "issued",          label: "Выдача"          },
  { value: "returned",        label: "Возврат"         },
  { value: "sent_repair",     label: "Сдан в ремонт"   },
  { value: "returned_repair", label: "Возвращён из ремонта" },
  { value: "written_off",     label: "Списан"          },
] as const;

export type TransferTypeValue = (typeof TRANSFER_TYPES)[number]["value"];

export const TRANSFER_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TRANSFER_TYPES.map((t) => [t.value, t.label])
);

// ── Sort ───────────────────────────────────────────────────────────────────

export const EQUIPMENT_SORT_FIELDS = [
  "displayName",
  "inventoryNumber",
  "status",
  "category",
  "location",
  "createdAt",
] as const;

export type EquipmentSortField = (typeof EQUIPMENT_SORT_FIELDS)[number];
export type SortDir = "asc" | "desc";

export const EQUIPMENT_PAGE_SIZE = 25;

// ── Zod schemas ────────────────────────────────────────────────────────────

export const StorageDeviceSchema = z.object({
  id:              z.string().uuid().optional(),
  type:            z.string().max(16).optional(),
  inventoryNumber: z.string().max(64).optional(),
  serialNumber:    z.string().max(128).min(1, "Обязательное поле"),
  manufacturer:    z.string().max(64).optional(),
  model:           z.string().max(128).optional(),
  capacityGb:      z.number().int().positive().optional(),
  interface:       z.string().max(32).optional(),
});

export type StorageDeviceFormValues = z.infer<typeof StorageDeviceSchema>;

export const EquipmentFormSchema = z.object({
  // Identity
  deviceType:      z.enum(["pэвм", "arm", "laptop", "server", "other"]),
  displayName:     z.string().min(1, "Обязательное поле").max(256),
  inventoryNumber: z.string().max(64).optional(),
  serialNumber:    z.string().max(128).optional(),
  mniSerialNumber: z.string().max(128).optional(),
  manufacturer:    z.string().max(64).optional(),
  model:           z.string().max(128).optional(),

  // Specs
  cpu:         z.string().max(128).optional(),
  ramGb:       z.number().int().positive().optional(),
  storageType: z.enum(["HDD", "SSD", "NVMe", "eMMC"]).optional(),
  storageGb:   z.number().int().positive().optional(),
  os:          z.string().max(128).optional(),

  // Status
  status:     z.enum(["in_use", "storage", "repair", "broken"]),
  isWorking:  z.boolean(),
  location:   z.string().max(256).optional(),
  personnelId: z.string().uuid().optional(),

  // Kit (completeness)
  hasCharger:       z.boolean().optional(),
  isChargerWorking: z.boolean().optional(),
  hasMouse:         z.boolean().optional(),
  isMouseWorking:   z.boolean().optional(),
  hasBag:           z.boolean().optional(),

  // Storage devices
  storageDevices: z.array(StorageDeviceSchema).optional(),
});

export type EquipmentFormValues = z.infer<typeof EquipmentFormSchema>;

// ── Batch operation schemas ───────────────────────────────────────────────

export const BatchIssueSchema = z.object({
  ids:          z.array(z.string().uuid()).min(1).max(500),
  toPersonnelId: z.string().uuid().optional(),
  toLocation:   z.string().max(256).optional(),
  documentRef:  z.string().max(128).optional(),
  notes:        z.string().max(512).optional(),
});

export const BatchMoveSchema = z.object({
  ids:        z.array(z.string().uuid()).min(1).max(500),
  toLocation: z.string().max(256).min(1, "Укажите местоположение"),
  notes:      z.string().max(512).optional(),
});

export type BatchIssueValues   = z.infer<typeof BatchIssueSchema>;
export type BatchMoveValues    = z.infer<typeof BatchMoveSchema>;

// ── List params ───────────────────────────────────────────────────────────

export interface EquipmentListParams {
  q?:        string;
  status?:   EquipmentStatus | "";
  category?: string;
  location?: string;
  page?:     number;
  sortBy?:   EquipmentSortField;
  sortDir?:  SortDir;
}