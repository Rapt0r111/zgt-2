/**
 * lib/auth.server.ts — Server-side auth
 *
 * Username strategy:
 *   We store usernames as email with @zgt.local suffix internally.
 *   Users see and type only the username part (e.g. "admin").
 *   The login form appends "@zgt.local" before calling the auth endpoint.
 *
 *   Why not the username plugin?
 *   It adds a dependency on an optional plugin that's still evolving.
 *   The @zgt.local approach is simpler and fully reliable.
 *
 * Cookie name: zgt_session (no dot — avoids some cookie parsers splitting it)
 */

import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { headers } from "next/headers";
import { cache } from "react";

// ── Auth instance ────────────────────────────────────────────────────────────
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    // better-auth looks for singular table names: "user", "session", etc.
    usePlural: false,
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },

  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 30,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  // Declare custom columns on the user table
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false, // not settable by users themselves
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: "strict",
      httpOnly: true,
      path: "/",
    },
  },
});

// ── App user type — better-auth user + our custom fields ─────────────────────
export interface AppUser {
  id: string;
  name: string;
  email: string;         // stored as username@zgt.local
  role: string;          // admin | officer | operator | user
  isActive: boolean;
}

// Extract username from the internal email format
export function emailToUsername(email: string): string {
  return email.replace(/@zgt\.local$/, "");
}

// Convert username to internal email format
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@zgt.local`;
}

// ── Role priority ─────────────────────────────────────────────────────────────
export type UserRole = "admin" | "officer" | "operator" | "user";

const ROLE_PRIORITY: Record<string, number> = {
  admin: 100,
  officer: 50,
  operator: 20,
  user: 10,
};

// ── getCurrentUser — deduplicated per request via React.cache ────────────────
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) return null;

    // better-auth infers additionalFields types from the config above,
    // but we help TypeScript with a cast here.
    const u = session.user as typeof session.user & {
      role?: string;
      isActive?: boolean;
    };

    // Treat inactive accounts as not logged in
    if (u.isActive === false) return null;

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role ?? "user",
      isActive: u.isActive ?? true,
    };
  } catch {
    return null;
  }
});

// ── Role guards ───────────────────────────────────────────────────────────────
export async function requireRole(minRole: UserRole): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const userPriority = ROLE_PRIORITY[user.role] ?? 0;
  const requiredPriority = ROLE_PRIORITY[minRole] ?? 0;
  if (userPriority < requiredPriority) throw new Error("Forbidden");

  return user;
}

export async function hasRole(minRole: UserRole): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return (ROLE_PRIORITY[user.role] ?? 0) >= (ROLE_PRIORITY[minRole] ?? 0);
}