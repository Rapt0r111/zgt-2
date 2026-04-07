import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

// drizzle-kit runs via Node.js, not Bun — must load .env manually
dotenv.config({ path: ".env.local" });

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