/** Public sitemap for SEO. Only public, indexable pages — /admin, /book
 * payment steps, /manage/* tokens and API routes are intentionally out. */
export default function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const paths = ["", "/book", "/privacy", "/policy"];
  return paths.map((p) => ({
    url: `${base}${p}`,
    changeFrequency: p === "" ? "weekly" : "monthly",
    priority: p === "" ? 1 : 0.6,
  }));
}
