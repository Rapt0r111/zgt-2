/**
 * proxy.ts — Next.js 16 Proxy (formerly Middleware)
 *
 * Runs on Edge before every matched request.
 * Responsibilities:
 *   1. Auth guard — redirect unauthenticated users to /login
 *   2. Role-based access — block insufficient roles
 *   3. Security headers injection
 *   4. Request ID injection for tracing
 *
 * NOTE: Keep this file FAST and THIN.
 * No DB calls, no heavy imports — only cookie/JWT checks.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Route config ────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - /login, /api/auth/*  (public auth routes)
     *  - /_next/static/*      (static assets)
     *  - /_next/image/*       (image optimization)
     *  - /favicon.ico
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};

// ── Role priority map ───────────────────────────────────────────────────────
const ROLE_PRIORITY: Record<string, number> = {
  admin: 100,
  officer: 50,
  operator: 20,
  user: 10,
};

// ── Routes that require elevated roles ──────────────────────────────────────
const PROTECTED_ROUTES: Array<{ pattern: RegExp; minRole: string }> = [
  { pattern: /^\/users/, minRole: "admin" },
  { pattern: /^\/equipment\/delete/, minRole: "officer" },
];

// ── Proxy function ───────────────────────────────────────────────────────────
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Read session token from httpOnly cookie (set by better-auth)
  const sessionToken = request.cookies.get("zgt.session")?.value;

  // ── Redirect unauthenticated users ───────────────────────────────────────
  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Decode JWT payload (no verify — DB session verified in RSC/API) ──────
  // Proxy only does a lightweight check; full verification happens in lib/auth
  let userRole = "user";
  try {
    const payload = JSON.parse(
      Buffer.from(sessionToken.split(".")[1], "base64url").toString()
    );
    userRole = payload.role ?? "user";

    // Check token expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    // Malformed token — force re-login
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // ── Role-based access control ────────────────────────────────────────────
  for (const route of PROTECTED_ROUTES) {
    if (route.pattern.test(pathname)) {
      const userPriority = ROLE_PRIORITY[userRole] ?? 0;
      const requiredPriority = ROLE_PRIORITY[route.minRole] ?? 0;

      if (userPriority < requiredPriority) {
        // Redirect to dashboard with error instead of 403 page
        const forbiddenUrl = new URL("/", request.url);
        forbiddenUrl.searchParams.set("error", "forbidden");
        return NextResponse.redirect(forbiddenUrl);
      }
    }
  }

  // ── Allowed — pass through with injected headers ──────────────────────────
  const requestId = crypto.randomUUID();
  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        "x-request-id": requestId,
        "x-user-role": userRole,  // Available to Route Handlers & RSC
      }),
    },
  });

  // Inject request ID into response for client-side tracing
  response.headers.set("x-request-id", requestId);

  return response;
}
