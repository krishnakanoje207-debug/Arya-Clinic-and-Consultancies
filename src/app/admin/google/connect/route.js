import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  STATE_COOKIE,
  STATE_COOKIE_PATH,
  buildConsentUrl,
  oauthConfigured,
  oauthRedirectUri,
} from "@/lib/google-oauth";

/**
 * Admin ▸ Settings ▸ "Connect Google account" — step 1 of the one-time
 * consent that lets the site create Meet rooms as the doctor.
 *
 * Deliberately NOT under /api/: src/proxy.js applies its same-origin check to
 * every /api/ request regardless of method, and the callback is a top-level
 * navigation arriving from accounts.google.com. A GET under /admin/ is exempt
 * from both that check and the POST rate limits.
 */
export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = await requireAdmin();
  if (!session.authed) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (!oauthConfigured()) {
    return NextResponse.redirect(
      new URL("/admin/settings?google=not_configured", request.url),
    );
  }

  // Random state, echoed back by Google and compared against this cookie in
  // the callback — the CSRF guard for a route the browser reaches from a
  // third-party redirect. SameSite=Lax so it survives that navigation.
  const state = randomUUID().replace(/-/g, "");
  const res = NextResponse.redirect(
    buildConsentUrl(oauthRedirectUri(request.url), state),
  );
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: STATE_COOKIE_PATH,
    maxAge: 600,
  });
  return res;
}
