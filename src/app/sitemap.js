import { getPublishedConditions } from "@/lib/content";
import { quizSlugs } from "@/lib/quiz-data";

/** Public sitemap for SEO. Only public, indexable pages — /admin, /book
 * payment steps, /manage/* tokens and API routes are intentionally out. */
export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const paths = ["", "/book", "/testimonials", "/privacy", "/policy", "/terms"];
  const staticEntries = paths.map((p) => ({
    url: `${base}${p}`,
    changeFrequency: p === "" ? "weekly" : "monthly",
    priority: p === "" ? 1 : 0.6,
  }));

  // getPublishedConditions has its own safe() fallback, so this never throws.
  const conditions = await getPublishedConditions();
  const conditionEntries = conditions.map((c) => ({
    url: `${base}/conditions/${c.slug}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const quizEntries = quizSlugs().map((slug) => ({
    url: `${base}/quiz/${slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...conditionEntries, ...quizEntries];
}
