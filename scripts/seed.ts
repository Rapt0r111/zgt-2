import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { user, personnel } from "../db/schema/index";
import { randomBytes } from "crypto";
import { Scrypt } from "oslo/password"; // ← используем oslo как better-auth

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const scrypt = new Scrypt();

async function createUser(params: {
  username: string;
  password: string;
  name: string;
  role: string;
}) {
  const email = `${params.username}@zgt.local`;

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existing.length > 0) {
    console.log(`  → ${params.username} already exists, skipping`);
    return;
  }

  const id = randomBytes(16).toString("hex");
  const hashedPassword = await scrypt.hash(params.password); // ← правильный формат
  const now = new Date();

  await db.insert(user).values({
    id,
    name: params.name,
    email,
    emailVerified: false,
    role: params.role,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  await db.execute(
    `INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
     VALUES ('${randomBytes(16).toString("hex")}', '${email}', 'credential', '${id}', '${hashedPassword}', now(), now())`
  );

  console.log(`  ✓ ${params.username} (${params.role})`);
}

// ── Seed personnel (same as before) ─────────────────────────────────────────
const SAMPLE_PERSONNEL = [
  {
    lastName: "Иванов", firstName: "Иван", middleName: "Иванович",
    personnelNumber: "АА001234", rank: "Майор", rankPriority: 14,
    position: "Начальник отдела", unit: "1-й взвод", status: "active" as const,
  },
  {
    lastName: "Петров", firstName: "Пётр", middleName: "Петрович",
    personnelNumber: "АА001235", rank: "Капитан", rankPriority: 12,
    position: "Заместитель начальника", unit: "1-й взвод", status: "active" as const,
  },
  {
    lastName: "Сидоров", firstName: "Сидор", middleName: "Сидорович",
    personnelNumber: "АА001236", rank: "Старший лейтенант", rankPriority: 10,
    position: "Специалист", unit: "2-й взвод", status: "active" as const,
  },
  {
    lastName: "Козлов", firstName: "Дмитрий", middleName: "Александрович",
    personnelNumber: "АА001237", rank: "Лейтенант", rankPriority: 8,
    position: "Специалист", unit: "2-й взвод", status: "active" as const,
  },
  {
    lastName: "Новиков", firstName: "Алексей", middleName: "Владимирович",
    personnelNumber: "АА001238", rank: "Прапорщик", rankPriority: 6,
    position: "Техник", unit: "3-й взвод", status: "active" as const,
  },
  {
    lastName: "Морозов", firstName: "Николай", middleName: "Сергеевич",
    personnelNumber: "АА001239", rank: "Старший сержант", rankPriority: 4,
    position: "Механик", unit: "3-й взвод", status: "active" as const,
  },
  {
    lastName: "Волков", firstName: "Виктор", middleName: "Михайлович",
    personnelNumber: "АА001240", rank: "Сержант", rankPriority: 3,
    position: "Водитель", unit: "4-й взвод", status: "leave" as const,
  },
  {
    lastName: "Лебедев", firstName: "Андрей", middleName: "Олегович",
    personnelNumber: "АА001241", rank: "Рядовой", rankPriority: 1,
    position: "Связист", unit: "4-й взвод", status: "active" as const,
  },
  {
    lastName: "Зайцев", firstName: "Михаил", middleName: "Павлович",
    personnelNumber: "АА001242", rank: "Рядовой", rankPriority: 1,
    position: "Оператор ЭВМ", unit: "1-й взвод", status: "hospital" as const,
  },
  {
    lastName: "Соколов", firstName: "Егор", middleName: "Романович",
    personnelNumber: "АА001243", rank: "Рядовой", rankPriority: 1,
    position: "Оператор ЭВМ", unit: "2-й взвод", status: "detached" as const,
  },
];

async function seed() {
  console.log("🌱 Seeding database...\n");

  console.log("Users:");
  await createUser({ username: "admin", password: "admin123", name: "Администратор", role: "admin" });
  await createUser({ username: "operator", password: "operator123", name: "Оператор", role: "operator" });

  console.log("\nPersonnel:");
  let created = 0;
  for (const p of SAMPLE_PERSONNEL) {
    const existing = await db
      .select({ id: personnel.id })
      .from(personnel)
      .where(eq(personnel.personnelNumber, p.personnelNumber!))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(personnel).values(p);
      created++;
    }
  }
  console.log(`  ✓ ${created} personnel records created (${SAMPLE_PERSONNEL.length - created} skipped)`);

  console.log("\n✅ Seed complete!");
  console.log("   Login: admin    / admin123");
  console.log("   Login: operator / operator123");
}

seed()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());