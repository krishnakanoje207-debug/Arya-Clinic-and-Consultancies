import { db } from "../db/index.js";
import { settings } from "../db/schema.js";
import { inArray } from "drizzle-orm";

/**
 * Default settings — every public/admin read falls back to these so the
 * site renders before the doctor has filled anything in. Real values are
 * written through the admin Settings panel.
 */
export const SETTINGS_DEFAULTS = {
  site_mode: "online", // "online" | "online+clinic"
  research_published: false,
  show_fee_on_cta: false, // when true, hero Book CTA shows the first-consult fee
  cancel_cutoff_hours: 4, // no online cancel/reschedule within N hours of start
  brand_name: "ARYA",
  brand_tagline: "Healing starts here",
  // Real client values double as code-level fallbacks so the site renders
  // fully before the DB is provisioned; the admin panel overrides them.
  upi_id: "seema.kanoje18-1@oksbi",
  upi_number: "8999758063",
  payee_name: "Dr. Seema Prajapati",
  clinic_address: "",
  maps_embed_url: "",
  notice_banner: "",
  contact_phone: "+91 89997 58063",
  contact_whatsapp: "918605015122",
  contact_email: "",
  google_reviews_url: "", // Google Business review link; badge hidden when empty
  // Fallback video room attached to online consults at confirmation when no
  // per-appointment link was generated (see src/lib/gcal.js). A reusable
  // "meeting for later" Meet link works here. Left empty ⇒ no link is set
  // and the doctor pastes one per appointment as before.
  default_meet_link: "",
  // Full-viewport photo behind the hero + About Me sections on the homepage
  // (a fixed layer the other opaque sections scroll over). Admin-overridable;
  // a warm clinic stock photo ships as the default.
  home_bg_image: "/photos/clinic-bg.jpg",
  social_links: [],
  consultation_hours:
    "By appointment · Online (worldwide) and clinic (Pune & Nagpur)",
  seo_title: "ARYA Homoeopathy — Dr. Seema Prajapati (BHMS)",
  seo_description:
    "Book online homoeopathy consultations with Dr. Seema Prajapati (BHMS), 20 years' experience. Women's health, paediatric, respiratory, skin and lifestyle disorders. Pune & Nagpur, and worldwide online.",
  medical_disclaimer:
    "Information on this site is for general awareness and is not a substitute for professional medical advice. Individual results vary.",
};

/** Read many settings at once, merged over defaults. Falls back to pure
 * defaults if the DB is unreachable (e.g. build time before provisioning). */
export async function getSettings(keys = Object.keys(SETTINGS_DEFAULTS)) {
  let found = {};
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(inArray(settings.key, keys));
    found = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch {
    found = {};
  }
  const out = {};
  for (const k of keys) {
    out[k] = k in found ? found[k] : SETTINGS_DEFAULTS[k];
  }
  return out;
}

export async function getSetting(key) {
  const [row] = await db.select().from(settings).where(inArray(settings.key, [key]));
  return row ? row.value : SETTINGS_DEFAULTS[key];
}

/** Upsert a single setting. */
export async function setSetting(key, value) {
  await db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    });
}

export function isClinicMode(settingsObj) {
  return settingsObj.site_mode === "online+clinic";
}
