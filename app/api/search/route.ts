/**
 * GET /api/search
 *
 * Query params:
 *   q       — search query (required, min 2 chars)
 *   modules — comma-separated list of modules (optional)
 *   page    — page number (default: 1)
 *
 * Used by:
 *   - Global search page (Server Component fetches directly via lib)
 *   - Command palette (Client Component uses this endpoint)
 *   - Future: external integrations, mobile apps
 */

import { type NextRequest, NextResponse } from "next/server";
import { globalSearch } from "@/lib/search.server";
import type { SearchModule } from "@/types/search";
import { SEARCH_MODULES } from "@/types/search";
import { getCurrentUser } from "@/lib/auth.server";

export const runtime = "nodejs"; // needs node-postgres

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ── Auth check ───────────────────────────────────────────────────────────
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse params ─────────────────────────────────────────────────────────
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") ?? "";
  const modulesParam = searchParams.get("modules");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  if (!query.trim() || query.trim().length < 2) {
    return NextResponse.json(
      { items: [], total: 0, query, modules: [], took: 0 },
      { status: 200 }
    );
  }

  // Validate and filter modules
  const requestedModules: SearchModule[] = modulesParam
    ? (modulesParam
        .split(",")
        .filter((m): m is SearchModule =>
          SEARCH_MODULES.includes(m as SearchModule)
        ))
    : [];

  try {
    const results = await globalSearch({
      query,
      modules: requestedModules,
      page,
    });

    return NextResponse.json(results, {
      headers: {
        // Allow CDN/proxy caching for 5s — fresh enough for intranet
        "Cache-Control": "private, max-age=5",
      },
    });
  } catch (error) {
    console.error("[Search API] Error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}