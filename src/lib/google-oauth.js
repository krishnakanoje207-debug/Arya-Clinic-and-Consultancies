import { getSettings, setSetting } from "@/lib/settings";

/**
 * One-time "connect my Google account" OAuth for the doctor's own consumer
 * Gmail account, sitting alongside the service-account grant in
 * src/lib/google-auth.js.
 *
 * Why both exist: a service account without domain-wide delegation cannot mint
 * a Google Meet conference — Calendar silently drops
 * conferenceData.createRequest and returns an event with no hangoutLink.
 * Creating the event *as the doctor* does work, so she consents once from
 * Admin ▸ Settings and the refresh token is stored as a setting.
 *
 * Env: GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET (a Web application
 * OAuth client — see GOOGLE-OAUTH-SETUP.md). Zero npm deps, raw fetch, same
 * best-effort contract as every other Google integration here: unconfigured or
 * broken ⇒ return null/false, never throw.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

/** Settings key holding the refresh token. Deliberately absent from
 * SETTINGS_DEFAULTS and from the admin form's editable key list: it is a
 * secret and must never be serialised into a client component's props. */
export const REFRESH_TOKEN_KEY = "google_oauth_refresh_token";

/** CSRF state cookie shared by the two /admin/google routes. Scoped to that
 * path so it never rides along on ordinary admin requests. */
export const STATE_COOKIE = "g_oauth_state";
export const STATE_COOKIE_PATH = "/admin/google";

/** The one-time consent lands here; the URI must match the Cloud Console
 * client exactly, so prefer the configured site origin over the request's. */
export function oauthRedirectUri(requestUrl) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(requestUrl).origin;
  return new URL("/admin/google/callback", base).toString();
}

/** True when the OAuth client credentials are present in the environment. */
export function oauthConfigured() {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );
}

/** True when the doctor has completed the consent and a refresh token is
 * stored. Best-effort: an unreadable settings row reads as "not connected". */
export async function oauthConnected() {
  if (!oauthConfigured()) return false;
  const s = await getSettings([REFRESH_TOKEN_KEY]);
  return Boolean(s[REFRESH_TOKEN_KEY]);
}

/** Google consent URL. access_type=offline + prompt=consent is what makes
 * Google return a refresh token (it omits one on repeat consents otherwise). */
export function buildConsentUrl(redirectUri, state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/** Swap the one-time consent code for a refresh token and store it. Returns
 * an error string on failure so the callback can report it in the UI. */
export async function connectWithCode(code, redirectUri) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) return { ok: false, error: `${res.status} ${await res.text()}` };
  const { refresh_token: refreshToken } = await res.json();
  if (!refreshToken) return { ok: false, error: "no refresh_token in response" };
  await setSetting(REFRESH_TOKEN_KEY, refreshToken);
  return { ok: true };
}

/** Forget the stored refresh token. The grant itself stays on Google's side
 * (revocable from the account's "Third-party apps" page). */
export async function disconnect() {
  await setSetting(REFRESH_TOKEN_KEY, "");
}

/**
 * Mint a short-lived access token acting as the doctor, or null when OAuth
 * isn't set up / the grant has been revoked. Never throws: callers fall back
 * to the service-account path, which is exactly today's behaviour.
 */
export async function getOAuthAccessToken() {
  try {
    if (!oauthConfigured()) return null;
    const s = await getSettings([REFRESH_TOKEN_KEY]);
    const refreshToken = s[REFRESH_TOKEN_KEY];
    if (!refreshToken) return null;
    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) {
      throw new Error(`refresh: ${res.status} ${await res.text()}`);
    }
    const { access_token: accessToken } = await res.json();
    return accessToken || null;
  } catch (err) {
    console.error("[google-oauth] token refresh failed:", err?.message || err);
    return null;
  }
}
