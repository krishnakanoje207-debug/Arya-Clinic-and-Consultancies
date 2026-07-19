import crypto from "crypto";

/**
 * Shared, zero-dep Google service-account auth for the Sheets (src/lib/sheets.js)
 * and Calendar (src/lib/gcal.js) integrations. Mirrors the JWT machinery in
 * src/lib/archive-drive.js (RS256 via node crypto → OAuth token, no npm deps),
 * generalised over the requested OAuth scope so each caller asks for exactly
 * what it needs.
 *
 * Env: GOOGLE_SERVICE_ACCOUNT_JSON = full service-account JSON on one line
 * (the same credential archive-drive.js uses). Every integration is
 * BEST-EFFORT: when it is unset, callers must silently no-op — this module is
 * never reached in that case.
 */

/** True when a service-account credential is present. */
export function googleConfigured() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Mint an OAuth access token for the given scope via the service-account JWT
 * grant. `scope` is a space-separated list of Google OAuth scopes. */
export async function getAccessToken(scope) {
  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = signer
    .sign(sa.private_key)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const jwt = `${header}.${claims}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`Google token: ${res.status} ${await res.text()}`);
  const { access_token } = await res.json();
  return access_token;
}
