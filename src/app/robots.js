/** robots.txt — allow public pages, keep the admin panel and per-patient
 * manage links out of search indexes. */
export default function robots() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/manage/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
