import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};

const PROTECTED_ROUTES: Array<{ pattern: RegExp; minRole: string }> = [
  { pattern: /^\/users/, minRole: "admin" },
  { pattern: /^\/equipment\/delete/, minRole: "officer" },
];

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // better-auth использует опaque токены (не JWT) — просто проверяем наличие куки
  const sessionToken = request.cookies.get("zgt_session")?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Роль берём из заголовка который better-auth может добавлять,
  // или просто пропускаем — реальная проверка роли в RSC через requireRole()
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