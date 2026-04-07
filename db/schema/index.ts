/**
 * Drizzle ORM Schema — ЗГТ System
 *
 * Design principles:
 *  - All PKs are UUIDs (gen_random_uuid) — portable across DBs
 *  - snake_case columns, camelCase TS fields
 *  - Every searchable text field contributes to tsvector index
 *  - Soft-delete via deleted_at (no hard DELETE in production)
 *  - Audit trail: created_at, updated_at, created_by, updated_by
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  smallint,
  boolean,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ── Custom tsvector type for full-text search ──────────────────────────────
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const personnelStatusEnum = pgEnum("personnel_status", [
  "active",       // В строю
  "detached",     // В командировке
  "hospital",     // В госпитале
  "leave",        // В отпуске
  "dismissed",    // Уволен
]);

export const equipmentStatusEnum = pgEnum("equipment_status", [
  "in_use",       // В работе
  "storage",      // На складе
  "repair",       // В ремонте
  "broken",       // Сломан
]);

export const deviceStatusEnum = pgEnum("device_status", [
  "checked_in",   // Сдан
  "checked_out",  // Выдан
]);

export const storageItemStatusEnum = pgEnum("storage_item_status", [
  "in_use",
  "stock",
  "broken",
  "lost",
]);

export const storageItemTypeEnum = pgEnum("storage_item_type", [
  "flash_drive",      // Флешка МО
  "electronic_pass",  // Электронный пропуск
]);

export const userRoleEnum = pgEnum("user_role", [
  "admin",    // 100
  "officer",  // 50
  "operator", // 20
  "user",     // 10
]);

export const equipmentCategoryEnum = pgEnum("equipment_category", [
  "workstation",  // ПЭВМ / АРМ
  "laptop",       // Ноутбук
  "server",       // Сервер
  "other",        // Прочая электроника
]);

export const transferTypeEnum = pgEnum("transfer_type", [
  "issued",
  "returned",
  "sent_repair",
  "returned_repair",
  "written_off",
]);

// ─────────────────────────────────────────────────────────────────────────────
// USERS (system accounts)
// ─────────────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    username: varchar("username", { length: 64 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: varchar("display_name", { length: 128 }).notNull(),
    role: userRoleEnum("role").notNull().default("user"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("users_username_idx").on(t.username)]
);

// ─────────────────────────────────────────────────────────────────────────────
// PERSONNEL (личный состав)
// ─────────────────────────────────────────────────────────────────────────────

export const personnel = pgTable(
  "personnel",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

    // Identity
    lastName: varchar("last_name", { length: 64 }).notNull(),
    firstName: varchar("first_name", { length: 64 }).notNull(),
    middleName: varchar("middle_name", { length: 64 }),
    personnelNumber: varchar("personnel_number", { length: 32 }).unique(),

    // Military
    rank: varchar("rank", { length: 64 }).notNull(),
    rankPriority: smallint("rank_priority").notNull().default(0),
    position: varchar("position", { length: 128 }),
    unit: varchar("unit", { length: 128 }),    // Взвод / подразделение

    // Status
    status: personnelStatusEnum("status").notNull().default("active"),
    notes: text("notes"),

    // Full-text search vector (auto-maintained via trigger)
    searchVector: tsvector("search_vector"),

    // Audit
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (t) => [
    index("personnel_search_idx").using("gin", t.searchVector),
    index("personnel_status_idx").on(t.status),
    index("personnel_name_idx").on(t.lastName, t.firstName),
    index("personnel_deleted_at_idx").on(t.deletedAt),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// PHONES (личные телефоны)
// ─────────────────────────────────────────────────────────────────────────────

export const phones = pgTable(
  "phones",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    personnelId: uuid("personnel_id")
      .notNull()
      .references(() => personnel.id),

    brand: varchar("brand", { length: 64 }),
    model: varchar("model", { length: 128 }).notNull(),
    color: varchar("color", { length: 32 }),
    imei1: varchar("imei1", { length: 18 }),
    imei2: varchar("imei2", { length: 18 }),
    serialNumber: varchar("serial_number", { length: 64 }),

    hasCamera: boolean("has_camera").notNull().default(false),
    hasVoiceRecorder: boolean("has_voice_recorder").notNull().default(false),

    status: deviceStatusEnum("status").notNull().default("checked_out"),
    storageCell: varchar("storage_cell", { length: 32 }),

    // FTS
    searchVector: tsvector("search_vector"),

    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("phones_personnel_idx").on(t.personnelId),
    index("phones_status_idx").on(t.status),
    index("phones_search_idx").using("gin", t.searchVector),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// EQUIPMENT (вычислительная техника)
// ─────────────────────────────────────────────────────────────────────────────

export const equipment = pgTable(
  "equipment",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

    category: equipmentCategoryEnum("category").notNull(),
    isPersonal: boolean("is_personal").notNull().default(false),

    // Identification
    displayName: varchar("display_name", { length: 256 }).notNull(),
    inventoryNumber: varchar("inventory_number", { length: 64 }), // Инвентарный номер МО
    serialNumber: varchar("serial_number", { length: 128 }),
    mniSerialNumber: varchar("mni_serial_number", { length: 128 }), // МНИ С/Н

    // Manufacturer
    manufacturer: varchar("manufacturer", { length: 64 }),
    model: varchar("model", { length: 128 }),

    // Specs (nullable — not required for "other" category)
    cpu: varchar("cpu", { length: 128 }),
    ramGb: smallint("ram_gb"),
    storageType: varchar("storage_type", { length: 32 }), // HDD / SSD / NVMe
    storageGb: integer("storage_gb"),
    os: varchar("os", { length: 128 }),

    // Kit completeness
    hasCharger: boolean("has_charger"),
    hasMouse: boolean("has_mouse"),
    hasBag: boolean("has_bag"),
    isChargerWorking: boolean("is_charger_working"),
    isMouseWorking: boolean("is_mouse_working"),

    // Assignment
    personnelId: uuid("personnel_id").references(() => personnel.id),
    location: varchar("location", { length: 256 }),
    status: equipmentStatusEnum("status").notNull().default("storage"),

    // FTS
    searchVector: tsvector("search_vector"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (t) => [
    // Partial unique index: inventory_number must be unique only when NOT NULL
    uniqueIndex("equipment_inventory_number_unique_idx")
      .on(t.inventoryNumber)
      .where(sql`${t.inventoryNumber} IS NOT NULL`),
    index("equipment_status_idx").on(t.status),
    index("equipment_category_idx").on(t.category),
    index("equipment_personnel_idx").on(t.personnelId),
    index("equipment_search_idx").using("gin", t.searchVector),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE DEVICES (накопители на оборудовании)
// ─────────────────────────────────────────────────────────────────────────────

export const storageDevices = pgTable(
  "storage_devices",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    equipmentId: uuid("equipment_id")
      .notNull()
      .references(() => equipment.id),

    manufacturer: varchar("manufacturer", { length: 64 }),
    model: varchar("model", { length: 128 }),
    inventoryNumber: varchar("inventory_number", { length: 64 }),
    serialNumber: varchar("serial_number", { length: 128 }),
    capacityGb: integer("capacity_gb").notNull(),
    interface: varchar("interface", { length: 32 }), // SATA / NVMe / USB
    type: varchar("type", { length: 16 }), // HDD / SSD

    searchVector: tsvector("search_vector"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("storage_devices_equipment_idx").on(t.equipmentId),
    index("storage_devices_search_idx").using("gin", t.searchVector),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE ITEMS (носители и пропуска)
// ─────────────────────────────────────────────────────────────────────────────

export const storageItems = pgTable(
  "storage_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

    type: storageItemTypeEnum("type").notNull(),
    inventoryNumber: varchar("inventory_number", { length: 64 }),
    serialNumber: varchar("serial_number", { length: 128 }),

    // Flash drive specific
    capacityGb: smallint("capacity_gb"),

    // Electronic pass specific
    accessLevel: smallint("access_level"),

    status: storageItemStatusEnum("status").notNull().default("stock"),
    personnelId: uuid("personnel_id").references(() => personnel.id),

    issuedAt: timestamp("issued_at", { withTimezone: true }),
    returnedAt: timestamp("returned_at", { withTimezone: true }),

    notes: text("notes"),
    searchVector: tsvector("search_vector"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("storage_items_type_idx").on(t.type),
    index("storage_items_status_idx").on(t.status),
    index("storage_items_personnel_idx").on(t.personnelId),
    index("storage_items_search_idx").using("gin", t.searchVector),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// EQUIPMENT TRANSFERS (история перемещений)
// ─────────────────────────────────────────────────────────────────────────────

export const equipmentTransfers = pgTable(
  "equipment_transfers",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    equipmentId: uuid("equipment_id")
      .notNull()
      .references(() => equipment.id),

    type: transferTypeEnum("type").notNull(),

    fromPersonnelId: uuid("from_personnel_id").references(() => personnel.id),
    toPersonnelId: uuid("to_personnel_id").references(() => personnel.id),
    fromLocation: varchar("from_location", { length: 256 }),
    toLocation: varchar("to_location", { length: 256 }),

    documentRef: varchar("document_ref", { length: 128 }),
    notes: text("notes"),

    transferredAt: timestamp("transferred_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (t) => [
    index("equipment_transfers_equipment_idx").on(t.equipmentId),
    index("equipment_transfers_date_idx").on(t.transferredAt),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const personnelRelations = relations(personnel, ({ many }) => ({
  phones: many(phones),
  equipment: many(equipment),
  storageItems: many(storageItems),
}));

export const equipmentRelations = relations(equipment, ({ one, many }) => ({
  personnel: one(personnel, {
    fields: [equipment.personnelId],
    references: [personnel.id],
  }),
  storageDevices: many(storageDevices),
  transfers: many(equipmentTransfers),
}));

export const phonesRelations = relations(phones, ({ one }) => ({
  personnel: one(personnel, {
    fields: [phones.personnelId],
    references: [personnel.id],
  }),
}));

export const storageItemsRelations = relations(storageItems, ({ one }) => ({
  personnel: one(personnel, {
    fields: [storageItems.personnelId],
    references: [personnel.id],
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// TYPE EXPORTS (inferred from schema)
// ─────────────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Personnel = typeof personnel.$inferSelect;
export type NewPersonnel = typeof personnel.$inferInsert;

export type Phone = typeof phones.$inferSelect;
export type NewPhone = typeof phones.$inferInsert;

export type Equipment = typeof equipment.$inferSelect;
export type NewEquipment = typeof equipment.$inferInsert;

export type StorageDevice = typeof storageDevices.$inferSelect;
export type StorageItem = typeof storageItems.$inferSelect;
export type EquipmentTransfer = typeof equipmentTransfers.$inferSelect;
