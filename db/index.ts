/**
 * Database connection — Drizzle ORM + node-postgres
 *
 * Uses a single Pool instance shared across the Node.js process.
 * On Lambda/serverless: swap Pool for @neondatabase/serverless neon()
 * for HTTP-based connections without persistent sockets.
 *
 * Migration path to cloud:
 *   1. Replace DATABASE_URL env var
 *   2. For managed PG (Neon, Supabase, RDS): import { neon } from "@neondatabase/serverless"
 *      and replace `new Pool(...)` with `drizzle(neon(process.env.DATABASE_URL!))`
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// ── Connection pool ────────────────────────────────────────────────────────
const globalPool = globalThis as unknown as { _pgPool?: Pool };

// Reuse pool in dev (HMR creates new modules on every save)
if (!globalPool._pgPool) {
  globalPool._pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : false,
  });
}

export const pool = globalPool._pgPool;

// ── Drizzle instance ───────────────────────────────────────────────────────
export const db = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV === "development",
});

export type DB = typeof db;

// ── Re-export schema types ─────────────────────────────────────────────────
export * from "./schema";
