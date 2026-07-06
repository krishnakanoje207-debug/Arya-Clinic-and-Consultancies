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

/** DB reads are wrapped so an unreachable database (e.g. build time before
 * Neon is provisioned) renders empty sections instead of crashing. */
async function safe(fn, fallback) {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

/** Real client data as the code-level fallback: the site presents the
 * doctor properly even before Neon is provisioned/seeded. Once the DB
 * row exists (seed or admin edits), it takes precedence. */
const DEFAULT_PROFILE = {
  id: 0,
  name: "Dr. Seema Prajapati",
  tagline: "Modern & classical homoeopathy — healing starts here",
  taglineHi: "आधुनिक एवं शास्त्रीय होम्योपैथी — यहीं से आरोग्य आरंभ",
  bio: "Dr. Seema Prajapati (BHMS) is a homoeopathic physician with 20 years of clinical experience, blending modern and classical homoeopathy. Based in Maharashtra, she cares for patients across Nagpur and Pune and offers online consultations worldwide.\n\nShe specialises in women's health — including menstrual problems, uterine fibroids and ovarian cysts — alongside dedicated paediatric care. Over two decades she has developed homoeopathic protocols for chronic respiratory conditions such as asthma, skin diseases, and metabolic and lifestyle disorders including diabetes, obesity and hair loss.",
  bioHi:
    "डॉ. सीमा प्रजापति (BHMS) 20 वर्षों के नैदानिक अनुभव वाली होम्योपैथिक चिकित्सक हैं, जो आधुनिक एवं शास्त्रीय होम्योपैथी का समन्वय करती हैं। महाराष्ट्र में स्थित, वे नागपुर और पुणे में तथा विश्वभर में ऑनलाइन परामर्श प्रदान करती हैं।",
  degrees: [
    { title: "BHMS", institution: "Bachelor of Homoeopathic Medicine & Surgery", year: "" },
  ],
  registrationNumber: "",
  registrationCouncil: "Maharashtra Council of Homoeopathy",
  yearsExperience: 20,
  stats: [
    { label: "Years Experience", label_hi: "वर्षों का अनुभव", value: "20+" },
    { label: "Cities Served", label_hi: "सेवित शहर", value: "Nagpur · Pune" },
    { label: "Online", label_hi: "ऑनलाइन", value: "Worldwide" },
  ],
  heroImage: "/brand/dr-seema.jpeg",
  aboutImage: "/brand/dr-seema.jpeg",
  socialLinks: [],
};

export async function getProfile() {
  return safe(async () => {
    const [row] = await db.select().from(profile).limit(1);
    return row ?? DEFAULT_PROFILE;
  }, DEFAULT_PROFILE);
}

/** Mirrors the seed list (fees are placeholders until the doctor sets real
 * ones in admin). Used only when the DB is unreachable or empty. */
const DEFAULT_SERVICES = [
  { id: 1, title: "First Consultation (Online)", titleHi: "पहला परामर्श (ऑनलाइन)", description: "Detailed case-taking video consultation for any new complaint — women's health, paediatric, respiratory, skin or lifestyle conditions.", durationMinutes: 30, feeInr: 500, mode: "online", isFollowUp: false, sortOrder: 1, active: true },
  { id: 2, title: "Follow-up Consultation (Online)", titleHi: "फ़ॉलो-अप परामर्श (ऑनलाइन)", description: "Review visit for an ongoing course of treatment.", durationMinutes: 15, feeInr: 300, mode: "online", isFollowUp: true, sortOrder: 2, active: true },
  { id: 3, title: "Women's Health Consultation", titleHi: "महिला स्वास्थ्य परामर्श", description: "Focused care for menstrual problems, uterine fibroids, ovarian cysts and related conditions.", durationMinutes: 30, feeInr: 500, mode: "online", isFollowUp: false, sortOrder: 3, active: true },
  { id: 4, title: "Paediatric Consultation", titleHi: "बाल रोग परामर्श", description: "Gentle homoeopathic care for children — immunity, recurrent infections, allergies and growth concerns.", durationMinutes: 30, feeInr: 500, mode: "online", isFollowUp: false, sortOrder: 4, active: true },
];

export async function getServices() {
  const rows = await safe(
    () =>
      db
        .select()
        .from(services)
        .where(eq(services.active, true))
        .orderBy(asc(services.sortOrder), asc(services.id)),
    null,
  );
  return rows && rows.length ? rows : DEFAULT_SERVICES;
}

export async function getPublishedCases() {
  return safe(
    () =>
      db
        .select()
        .from(caseGallery)
        .where(
          and(
            eq(caseGallery.published, true),
            eq(caseGallery.consentConfirmed, true),
          ),
        )
        .orderBy(asc(caseGallery.sortOrder), desc(caseGallery.id)),
    [],
  );
}

export async function getPublishedTestimonials() {
  return safe(
    () =>
      db
        .select()
        .from(testimonials)
        .where(eq(testimonials.published, true))
        .orderBy(asc(testimonials.sortOrder), desc(testimonials.id)),
    [],
  );
}

/** Same researched questions the seed installs — shown until the DB serves
 * real rows so the FAQ section is never empty on a fresh deploy. */
const DEFAULT_FAQS = [
  ["About homoeopathy", "What is homoeopathy and how does it work?", "Homoeopathy treats the whole person with highly individualised remedies chosen to match your symptom picture, aiming to stimulate the body's own healing response."],
  ["About homoeopathy", "Is homoeopathy safe? Are there side effects?", "Remedies are prepared in minute doses and are generally very gentle. Always tell the doctor about any existing medicines you take."],
  ["About homoeopathy", "What is 'homoeopathic aggravation'?", "Occasionally symptoms briefly intensify before improving — a well-known, usually short-lived response your doctor will guide you through."],
  ["About homoeopathy", "How long until I see improvement?", "Acute complaints often respond within a few doses; chronic conditions are treated over weeks with regular follow-ups."],
  ["Consultations", "What happens in the first consultation?", "Expect detailed questions about your symptoms, history, temperament and lifestyle — classical case-taking so treatment fits you specifically."],
  ["Consultations", "Can I take remedies alongside my existing medicines?", "Usually yes, but never stop prescribed medication without advice. Share your full medication list during the consultation."],
  ["Consultations", "How do online consultations work?", "After booking and payment you receive a video-call link; consultations by video, audio or text are permitted under telemedicine guidelines."],
  ["Booking & payment", "How do I pay, and what if my payment hold expires?", "Pay by UPI during the 15-minute hold and enter your transaction reference. If the hold lapses after you've paid, submit the reference anyway and the doctor will restore or reschedule your slot."],
  ["Booking & payment", "Can I reschedule or cancel?", "Yes — every confirmation includes a secure link to reschedule or cancel without needing an account."],
].map(([category, question, answer], i) => ({
  id: i + 1,
  category,
  question,
  questionHi: null,
  answer,
  answerHi: null,
  sortOrder: i,
  published: true,
}));

export async function getPublishedFaqs() {
  const rows = await safe(
    () =>
      db
        .select()
        .from(faqs)
        .where(eq(faqs.published, true))
        .orderBy(asc(faqs.sortOrder), asc(faqs.id)),
    null,
  );
  return rows && rows.length ? rows : DEFAULT_FAQS;
}

/** Research is public only when the admin toggle is on AND ≥1 visible item
 * exists (plan §3.3). Returns { published, items }. */
export async function getResearchSection() {
  const { research_published } = await getSettings(["research_published"]);
  if (!research_published) return { published: false, items: [] };
  const items = await safe(
    () =>
      db
        .select()
        .from(researchItems)
        .where(eq(researchItems.visible, true))
        .orderBy(asc(researchItems.sortOrder), desc(researchItems.publishedAt)),
    [],
  );
  return { published: items.length > 0, items };
}
