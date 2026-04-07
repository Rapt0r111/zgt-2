/**
 * /api/auth/[...all] — better-auth catch-all handler
 *
 * Handles:
 *   POST /api/auth/sign-in/email
 *   POST /api/auth/sign-out
 *   GET  /api/auth/session
 *   ... and all other better-auth endpoints
 */

import { auth } from "@/lib/auth.server";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
