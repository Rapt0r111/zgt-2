/**
 * GET /api/health
 *
 * Docker healthcheck endpoint.
 * Verifies DB connectivity in addition to app availability.
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface HealthResponse {
  status: "ok" | "degraded" | "error";
  version: string;
  timestamp: string;
  checks: {
    database: "ok" | "error";
    dbLatencyMs?: number;
  };
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const start = Date.now();

  let dbStatus: "ok" | "error" = "error";
  let dbLatencyMs: number | undefined;

  try {
    await db.execute(sql`SELECT 1`);
    dbLatencyMs = Date.now() - start;
    dbStatus = "ok";
  } catch {
    // DB unavailable — still return 200 so Docker retries
    // Return 503 only if we want the container to be marked unhealthy
  }

  const isHealthy = dbStatus === "ok";

  return NextResponse.json(
    {
      status: isHealthy ? "ok" : "degraded",
      version: process.env.APP_VERSION ?? "dev",
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        ...(dbLatencyMs !== undefined && { dbLatencyMs }),
      },
    },
    { status: isHealthy ? 200 : 503 }
  );
}
