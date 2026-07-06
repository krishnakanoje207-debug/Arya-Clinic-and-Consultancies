/**
 * Rate limiting at the network boundary (Next 16 `proxy` convention —
 * Node runtime; the old `middleware.js` name is deprecated).
 *
 * Fixed-window counters per IP+path over the POST surfaces a bot can
 * abuse: booking/server actions, the contact form, login attempts and
 * manage-token probing. In-memory: on serverless this is per-instance, so
 * treat it as burst protection, not a hard quota — the DB-level hold cap
 * in src/lib/booking.js is the real anti-slot-hoarding guard. Zero-cost
 * rule forbids an external rate-limit store.
 */
const WINDOWS = new Map(); // key -> { count, resetAt }
const MAX_KEYS = 5000;

const RULES = [
  // [pathname test, max requests, window ms]
  [(p) => p === "/book", 20, 5 * 60_000],
  [(p) => p === "/", 10, 5 * 60_000],
  [(p) => p === "/admin/login", 10, 15 * 60_000],
  [(p) => p.startsWith("/manage/"), 15, 5 * 60_000],
  [(p) => p.startsWith("/api/auth/"), 20, 15 * 60_000],
];

function isLimited(key, max, windowMs) {
  const now = Date.now();
  // Cheap sweep so the map can't grow unbounded on a long-lived instance.
  if (WINDOWS.size > MAX_KEYS) {
    for (const [k, v] of WINDOWS) if (v.resetAt <= now) WINDOWS.delete(k);
  }
  const entry = WINDOWS.get(key);
  if (!entry || entry.resetAt <= now) {
    WINDOWS.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

export function proxy(request) {
  if (request.method !== "POST") return;

  const { pathname } = new URL(request.url);
  const rule = RULES.find(([test]) => test(pathname));
  if (!rule) return;

  const ip =
    (request.headers.get("x-forwarded-for") || "")
      .split(",")[0]
      .trim() || "local";

  const [, max, windowMs] = rule;
  if (isLimited(`${pathname}:${ip}`, max, windowMs)) {
    return new Response("Too many requests. Please try again shortly.", {
      status: 429,
      headers: { "retry-after": String(Math.ceil(windowMs / 1000)) },
    });
  }
}

export const config = {
  matcher: ["/", "/book", "/admin/login", "/manage/:path*", "/api/auth/:path*"],
};
