import { auth } from "@/auth";

/**
 * Session check used by the admin layout and EVERY admin server action.
 * Backed by Auth.js v5 credentials (see src/auth.js) — replaces the
 * earlier admin_dev development cookie.
 */
export async function requireAdmin() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  return { authed: Boolean(email), email };
}
