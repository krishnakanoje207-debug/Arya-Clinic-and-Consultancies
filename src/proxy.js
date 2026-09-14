/**
 * Network-boundary guards (Next 16 `proxy` convention — Node runtime; the
 * old `middleware.js` name is deprecated).
 *
 * Three jobs, in order: per-request CSP nonce, same-origin check on
 * mutations, fixed-window rate limits.
 *
 * Rate limits are fixed-window counters per IP+path over the POST surfaces
 * a bot can abuse: booking/server actions, the contact form, login attempts,
 * manage-token probing, quiz leads, the patient dashboard and booking-status
 * polling. In-memory: on serverless this is per-instance,
 * so treat it as burst protection, not a hard quota — the DB-level hold cap
 * in src/lib/booking.js is the real anti-slot-hoarding guard. Zero-cost rule
 * forbids an external rate-limit store.
 */
import { NextResponse } from "next/server";

const WINDOWS = new Map(); // key -> { count, resetAt }
const MAX_KEYS = 5000;

const RULES = [
  // [pathname test, max requests, window ms]
  [(p) => p === "/book", 20, 5 * 60_000],
  [(p) => p === "/", 10, 5 * 60_000],
  [(p) => p === "/admin/login", 10, 15 * 60_000],
  [(p) => p.startsWith("/manage/"), 15, 5 * 60_000],
  [(p) => p.startsWith("/api/auth/"), 20, 15 * 60_000],
  // Quiz lead submissions (each one writes a quiz_leads row).
  [(p) => p.startsWith("/quiz/"), 10, 5 * 60_000],
  // Patient dashboard: medication payment (opens a Razorpay order), its
  // status polling (up to 15 calls per payment), reviews and intake answers.
  [(p) => p.startsWith("/patient/"), 60, 5 * 60_000],
  // Post-payment polling. BookingFlow's checkout poll (every 3 s) can overlap
  // the confirmation screen's poll (every 2 s): ~250 calls in 5 minutes at
  // worst. The cap is well above that; it only stops a script hammering it.
  [(p) => p === "/api/booking-status", 600, 5 * 60_000],
];

/**
 * Nonce-based CSP. Every page here is server-rendered on demand (nothing but
 * robots/sitemap/favicon is prerendered), so Next can stamp this nonce onto
 * its own inline scripts on every request — the prerequisite for dropping
 * 'unsafe-inline' from script-src.
 *
 * 'strict-dynamic' is what lets Razorpay checkout and the Cloudinary upload
 * widget load: both are injected by document.createElement("script") from our
 * own (nonced) bundles, so they inherit trust. The host list after it is the
 * fallback for browsers that don't implement 'strict-dynamic'.
 *
 * style-src keeps 'unsafe-inline' deliberately: the app uses inline style
 * attributes and third-party widgets inject their own styles. A nonce in
 * style-src would make browsers ignore 'unsafe-inline' and break both.
 */
function buildCsp(nonce) {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    // React uses eval in development only, for server-stack reconstruction.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://upload-widget.cloudinary.com https://va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' https://res.cloudinary.com",
    "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://checkout.razorpay.com https://api.cloudinary.com https://res.cloudinary.com https://upload-widget.cloudinary.com https://vitals.vercel-insights.com",
    "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://upload-widget.cloudinary.com https://www.google.com https://maps.google.com https://www.youtube.com https://www.youtube-nocookie.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function allowedOrigins(request) {
  const origins = new Set([new URL(request.url).origin]);
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredSiteUrl) {
    try {
      origins.add(new URL(configuredSiteUrl).origin);
    } catch {
      // An invalid optional site URL must not disable the application.
    }
  }
  return origins;
}

function hasTrustedOrigin(request) {
  const origin = request.headers.get("origin");
  if (origin) return allowedOrigins(request).has(origin);

  const referer = request.headers.get("referer");
  if (!referer) return true; // Non-browser clients send neither header.
  try {
    return allowedOrigins(request).has(new URL(referer).origin);
  } catch {
    return false;
  }
}

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

function blocked(body, status, extraHeaders) {
  return new Response(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      "x-content-type-options": "nosniff",
      ...extraHeaders,
    },
  });
}

export function proxy(request) {
  const { pathname } = new URL(request.url);

  // The webhook is a server-to-server POST from Razorpay: no Origin header,
  // and its own HMAC signature check is the real authentication. It must not
  // be subject to the browser-oriented checks below.
  const isWebhook = pathname === "/api/razorpay/webhook";

  const isApiRequest = pathname.startsWith("/api/");
  const isServerAction =
    request.method === "POST" &&
    (pathname === "/" ||
      pathname === "/book" ||
      pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      pathname.startsWith("/manage/") ||
      pathname.startsWith("/patient/"));

  // Next Server Actions and Auth.js already validate their own CSRF tokens.
  // This same-origin check adds a defense-in-depth boundary for browser
  // mutations and prevents cross-origin API access from being enabled later.
  if (!isWebhook && (isApiRequest || isServerAction) && !hasTrustedOrigin(request)) {
    return blocked("Cross-site request blocked", 403);
  }

  if (request.method === "POST") {
    const rule = RULES.find(([test]) => test(pathname));
    if (rule) {
      const ip =
        (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
        "local";
      const [, max, windowMs] = rule;
      if (isLimited(`${pathname}:${ip}`, max, windowMs)) {
        return blocked("Too many requests. Please try again shortly.", 429, {
          "retry-after": String(Math.ceil(windowMs / 1000)),
        });
      }
    }
  }

  // Next reads the nonce back out of the request's CSP header to stamp it on
  // the framework's own script tags, so both headers have to carry it.
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Everything except build assets, which are same-origin static files
      // already covered by the header rules in next.config.mjs. Prefetches are
      // skipped so a cached RSC payload can't carry a stale nonce.
      source: "/((?!_next/static|_next/image).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
