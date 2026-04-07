/**
 * lib/auth.server.ts — Server-side auth utilities
 *
 * "server-only" import prevents accidental use in Client Components.
 * Uses better-auth with Drizzle adapter for session management.
 *
 * Migration note: better-auth supports OAuth, LDAP, SAML adapters —
 * swap the provider config to integrate with Active Directory if needed.
 */

import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, users } from "@/db";
import { headers } from "next/headers";
import { cache } from "react";

// ── Auth instance ───────────────────────────────────────────────────────────
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: false,
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Intranet — no email server needed
    minPasswordLength: 8,
  },

  session: {
    cookieName: "zgt.session",
    expiresIn: 60 * 60 * 8, // 8 hours (work day)
    updateAge: 60 * 30,      // Refresh every 30 min of activity
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,        // Client-side cache 5 min
    },
  },

  advanced: {
    // Use JWT for session tokens (lighter than DB lookup in Proxy)
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: "strict",
      httpOnly: true,
      path: "/",
    },
  },
});

// ── React.cache — deduplicated per request ──────────────────────────────────
// Multiple Server Components calling getCurrentUser() in the same render
// will only hit the DB once per request.
export const getCurrentUser = cache(async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session?.user ?? null;
  } catch {
    return null;
  }
});

// ── Role helpers ─────────────────────────────────────────────────────────────
export type UserRole = "admin" | "officer" | "operator" | "user";

const ROLE_PRIORITY: Record<UserRole, number> = {
  admin: 100,
  officer: 50,
  operator: 20,
  user: 10,
};

export async function requireRole(minRole: UserRole): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  const userPriority = ROLE_PRIORITY[user.role as UserRole] ?? 0;
  const requiredPriority = ROLE_PRIORITY[minRole];
  if (userPriority < requiredPriority) {
    throw new Error("Forbidden");
  }
}

export async function hasRole(minRole: UserRole): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const userPriority = ROLE_PRIORITY[user.role as UserRole] ?? 0;
  return userPriority >= ROLE_PRIORITY[minRole];
}
