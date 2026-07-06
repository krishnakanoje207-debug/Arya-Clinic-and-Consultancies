/**
 * Admin smoke test — guards against the RSC "render function" regression that
 * 500'd four admin pages (see PLAN-fixes-2026-07-06.md / O1). Logs in with the
 * seeded ADMIN_* credentials and asserts every admin route returns 200.
 *
 *   docker compose up -d && npm run dev      # server must be running
 *   node --env-file=.env scripts/smoke-admin.mjs
 *
 * Exits non-zero on the first non-200 so it can gate CI / pre-deploy.
 */
const BASE = process.env.SITE_URL || "http://localhost:3000";
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("✗ ADMIN_EMAIL/ADMIN_PASSWORD missing — run with --env-file=.env");
  process.exit(2);
}

// Minimal cookie jar: name -> value, refreshed from every response.
const jar = new Map();
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
function absorb(res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";");
    const idx = pair.indexOf("=");
    if (idx > 0) jar.set(pair.slice(0, idx), pair.slice(idx + 1));
  }
}

async function main() {
  // 1. CSRF token (also sets the csrf cookie).
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, {
    headers: { cookie: cookieHeader() },
  });
  absorb(csrfRes);
  const { csrfToken } = await csrfRes.json();
  if (!csrfToken) throw new Error("no csrfToken from /api/auth/csrf");

  // 2. Log in. Auth.js replies 302 and sets the session cookie; capture it
  //    with a manual redirect so the Set-Cookie header isn't lost.
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: cookieHeader(),
    },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASSWORD }),
  });
  absorb(loginRes);
  const hasSession = [...jar.keys()].some((k) => k.includes("session-token"));
  if (!hasSession) {
    console.error(`✗ login failed (status ${loginRes.status}) — no session cookie set`);
    process.exit(1);
  }

  // 3. Every admin route must render 200 (307 = bounced to login = fail).
  const ROUTES = [
    "/admin",
    "/admin/appointments",
    "/admin/availability",
    "/admin/content",
    "/admin/research",
    "/admin/templates",
    "/admin/settings",
    "/admin/account",
  ];
  let failed = 0;
  for (const path of ROUTES) {
    const res = await fetch(`${BASE}${path}`, {
      redirect: "manual",
      headers: { cookie: cookieHeader() },
    });
    const ok = res.status === 200;
    if (!ok) failed++;
    console.log(`${ok ? "✓" : "✗"} ${path} → ${res.status}`);
  }

  if (failed) {
    console.error(`\n✗ ${failed}/${ROUTES.length} admin routes failed`);
    process.exit(1);
  }
  console.log(`\n✓ all ${ROUTES.length} admin routes returned 200`);
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ smoke test error:", err.message);
  process.exit(1);
});
