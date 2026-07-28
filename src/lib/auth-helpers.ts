import { getRequest } from "@tanstack/react-start/server";

import { auth } from "./auth";

/**
 * Returns the current Better Auth session (or null) for the incoming request.
 * Safe to call inside server function handlers / route loaders.
 */
export async function getSession() {
  const request = getRequest();
  return auth.api.getSession({ headers: request.headers });
}

/**
 * Enforces an authenticated admin session. Call this at the TOP of every
 * mutating server function handler. Because server functions are RPC endpoints
 * reachable by direct POST, the admin check MUST live in the handler (not just
 * the route). Mirrors the old NextAuth admin gate (email allow-list).
 *
 * Implemented as an in-handler check (rather than middleware) so the auth /
 * Better Auth imports stay inside handler bodies and are stripped from the
 * client bundle by the TanStack Start compiler.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Tidak terautentikasi.");
  }
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && session.user.email !== adminEmail) {
    throw new Error("Akses ditolak.");
  }
  return session.user;
}
