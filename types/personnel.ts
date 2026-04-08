/**
 * Personnel module — shared types, constants, Zod schemas
 */
import { z } from "zod";

export const MILITARY_RANKS = [
  { label: "Рядовой",                     priority: 1  },
  { label: "Ефрейтор",                    priority: 2  },
  { label: "Младший сержант",             priority: 3  },
  { label: "Сержант",                     priority: 4  },
  { label: "Старший сержант",             priority: 5  },
  { label: "Старшина",                    priority: 6  },
  { label: "Прапорщик",                   priority: 7  },
  { label: "Старший прапорщик",           priority: 8  },
  { label: "Младший лейтенант",           priority: 9  },
  { label: "Лейтенант",                   priority: 10 },
  { label: "Старший лейтенант",           priority: 11 },
  { label: "Капитан",                     priority: 12 },
  { label: "Майор",                       priority: 13 },
  { label: "Подполковник",                priority: 14 },
  { label: "Полковник",                   priority: 15 },
  { label: "Генерал-майор",               priority: 16 },
  { label: "Генерал-лейтенант",           priority: 17 },
  { label: "Генерал-полковник",           priority: 18 },
  { label: "Генерал армии",               priority: 19 },
  { label: "Маршал Российской Федерации", priority: 20 },
] as const;

export type RankLabel = (typeof MILITARY_RANKS)[number]["label"];

export const RANK_LABEL_TO_PRIORITY = Object.fromEntries(
  MILITARY_RANKS.map((r) => [r.label, r.priority])
) as Record<string, number>;

export const PERSONNEL_STATUSES = [
  { value: "active",    label: "В строю",      color: "emerald" },
  { value: "detached",  label: "Командировка",  color: "blue"    },
  { value: "hospital",  label: "Госпиталь",     color: "amber"   },
  { value: "leave",     label: "Отпуск",        color: "violet"  },
  { value: "dismissed", label: "Уволен",        color: "red"     },
] as const;

export type PersonnelStatus = (typeof PERSONNEL_STATUSES)[number]["value"];

export const STATUS_MAP = Object.fromEntries(
  PERSONNEL_STATUSES.map((s) => [s.value, s])
) as Record<PersonnelStatus, (typeof PERSONNEL_STATUSES)[number]>;

export const PersonnelFormSchema = z.object({
  lastName:        z.string().min(1, "Обязательное поле").max(64),
  firstName:       z.string().min(1, "Обязательное поле").max(64),
  middleName:      z.string().max(64).optional(),
  personnelNumber: z.string().max(32).optional(),
  rank:            z.string().min(1, "Выберите звание"),
  rankPriority:    z.number().int().min(1).max(20),
  position:        z.string().max(128).optional(),
  unit:            z.string().max(128).optional(),
  status:          z.enum(["active", "detached", "hospital", "leave", "dismissed"]),
  notes:           z.string().max(2000).optional(),
});

export type PersonnelFormValues = z.infer<typeof PersonnelFormSchema>;

export const SORT_FIELDS = ["lastName", "rank", "status", "unit", "createdAt"] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortDir = "asc" | "desc";

export interface PersonnelListParams {
  q?:       string;
  status?:  PersonnelStatus | "";
  unit?:    string;
  rank?:    string;
  page?:    number;
  sortBy?:  SortField;
  sortDir?: SortDir;
}

export const PERSONNEL_PAGE_SIZE = 25;