import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  STATE_COOKIE,
  STATE_COOKIE_PATH,
  connectWithCode,
  oauthRedirectUri,
} from "@/lib/google-oauth";

/**
 * Step 2 of the one-time Google consent: Google redirects here with ?code and
 * the ?state we planted in a cookie. Verifies the session and the state, then
 * stores the refresh token as a setting. Always lands back on Admin ▸ Settings
 * with a ?google=<outcome> the page turns into a message.
 */
export const dynamic = "force-dynamic";

function back(request, outcome) {
  const res = NextResponse.redirect(
    new URL(`/admin/settings?google=${outcome}`, request.url),
  );
  res.cookies.set(STATE_COOKIE, "", { path: STATE_COOKIE_PATH, maxAge: 0 });
  return res;
}

export async function GET(request) {
  const session = await requireAdmin();
  if (!session.authed) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const params = new URL(request.url).searchParams;
  if (params.get("error")) return back(request, "denied");

  const state = params.get("state");
  const expected = request.cookies.get(STATE_COOKIE)?.value;
  if (!state || !expected || state !== expected) return back(request, "state");

  const code = params.get("code");
  if (!code) return back(request, "failed");

  try {
    const res = await connectWithCode(code, oauthRedirectUri(request.url));
    if (!res.ok) {
      console.error("[google-oauth] consent exchange failed:", res.error);
      return back(request, "failed");
    }
  } catch (err) {
    console.error("[google-oauth] consent exchange failed:", err?.message || err);
    return back(request, "failed");
  }
  return back(request, "connected");
}
