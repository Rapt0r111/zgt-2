import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // better-auth may name the cookie "zgt_session" or prefix it.
  // Check all cookies for a match rather than a hardcoded exact name.
  const allCookies = request.cookies.getAll();
  const hasSession = allCookies.some(
    (c) => c.name === "zgt_session" || c.name.startsWith("zgt_session")
  );

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const requestId = crypto.randomUUID();
  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        "x-request-id": requestId,
      }),
    },
  });

  response.headers.set("x-request-id", requestId);
  return response;
}