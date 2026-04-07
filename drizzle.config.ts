import type { Config } from "drizzle-kit";

// Bun auto-loads .env.local — no dotenv import needed.
// For plain Node.js scripts (migrate.js), dotenv is still used there.

export default {
  schema: "./db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;