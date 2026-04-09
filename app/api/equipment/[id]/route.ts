/**
 * GET /api/equipment/[id]
 * Used by EquipmentFormDrawer to fetch data for edit mode.
 */

import { type NextRequest, NextResponse } from "next/server";
import { getEquipmentById } from "@/lib/equipment.server";
import { getCurrentUser } from "@/lib/auth.server";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const row = await getEquipmentById(id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(row);
}