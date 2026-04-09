/**
 * GET /api/personnel/search
 * Quick search for PersonnelPicker — returns lightweight list.
 * Query params: q (search string), limit (default 20)
 */

import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth.server";
import { db } from "@/db";
import { personnel } from "@/db/schema";
import { and, isNull, ilike, or, asc, eq } from "drizzle-orm";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q     = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(50, Number(request.nextUrl.searchParams.get("limit") ?? "20"));

  const conditions = [isNull(personnel.deletedAt), eq(personnel.status, "active")];

  if (q) {
    const term = `%${q}%`;
    conditions.push(
      or(
        ilike(personnel.lastName,  term),
        ilike(personnel.firstName, term),
        ilike(personnel.personnelNumber, term),
        ilike(personnel.rank,      term),
      )!
    );
  }

  const rows = await db
    .select({
      id:              personnel.id,
      lastName:        personnel.lastName,
      firstName:       personnel.firstName,
      middleName:      personnel.middleName,
      rank:            personnel.rank,
      personnelNumber: personnel.personnelNumber,
      unit:            personnel.unit,
    })
    .from(personnel)
    .where(and(...conditions))
    .orderBy(asc(personnel.lastName), asc(personnel.firstName))
    .limit(limit);

  return NextResponse.json(rows);
}