import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  caseGallery,
  faqs,
  profile,
  researchItems,
  services,
  testimonials,
} from "@/db/schema";
import { getSettings } from "@/lib/settings";

/**
 * Pick the locale-appropriate value of a content field. DB content carries
 * optional Hindi variants ("<field>Hi"); when Hindi is empty we fall back
 * to English, so the doctor can translate at her own pace (plan §6).
 */
export function localized(row, field, locale) {
  if (!row) return "";
  if (locale === "hi") {
    const hi = row[`${field}Hi`];
    if (hi) return hi;
  }
  return row[field] ?? "";
}

export async function getProfile() {
  const [row] = await db.select().from(profile).limit(1);
  return row ?? null;
}

export async function getServices() {
  return db
    .select()
    .from(services)
    .where(eq(services.active, true))
    .orderBy(asc(services.sortOrder), asc(services.id));
}

export async function getPublishedCases() {
  return db
    .select()
    .from(caseGallery)
    .where(
      and(eq(caseGallery.published, true), eq(caseGallery.consentConfirmed, true)),
    )
    .orderBy(asc(caseGallery.sortOrder), desc(caseGallery.id));
}

export async function getPublishedTestimonials() {
  return db
    .select()
    .from(testimonials)
    .where(eq(testimonials.published, true))
    .orderBy(asc(testimonials.sortOrder), desc(testimonials.id));
}

export async function getPublishedFaqs() {
  return db
    .select()
    .from(faqs)
    .where(eq(faqs.published, true))
    .orderBy(asc(faqs.sortOrder), asc(faqs.id));
}

/** Research is public only when the admin toggle is on AND ≥1 visible item
 * exists (plan §3.3). Returns { published, items }. */
export async function getResearchSection() {
  const { research_published } = await getSettings(["research_published"]);
  if (!research_published) return { published: false, items: [] };
  const items = await db
    .select()
    .from(researchItems)
    .where(eq(researchItems.visible, true))
    .orderBy(asc(researchItems.sortOrder), desc(researchItems.publishedAt));
  return { published: items.length > 0, items };
}
