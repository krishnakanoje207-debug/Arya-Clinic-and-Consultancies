import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.js");

// Static assets under public/ are served with `Access-Control-Allow-Origin: *`
// by default, which scanners flag as a cross-domain misconfiguration. Nothing
// here is meant to be read cross-origin, so pin it to our own origin.
const SITE_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL).origin;
  } catch {
    return "https://arya-clinic-and-consultancies.vercel.app";
  }
})();

// Applied to every response. The Content-Security-Policy is NOT here: it
// carries a per-request nonce and is set in src/proxy.js instead.
const BASE_SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Access-Control-Allow-Origin", value: SITE_ORIGIN },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

// Pages that carry credentials or patient data must never sit in a shared
// cache, and must not leak their URL (which contains access tokens) onward.
const PRIVATE_HEADERS = [
  { key: "Cache-Control", value: "no-store" },
  { key: "Referrer-Policy", value: "no-referrer" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    // Served to browsers that accept them; JPEG/PNG stays the fallback.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: BASE_SECURITY_HEADERS },
      { source: "/api/auth/:path*", headers: PRIVATE_HEADERS },
      { source: "/admin/:path*", headers: PRIVATE_HEADERS },
      { source: "/manage/:path*", headers: PRIVATE_HEADERS },
      { source: "/patient/:path*", headers: PRIVATE_HEADERS },
    ];
  },
};

export default withNextIntl(nextConfig);
