import { db } from "@/db";
import { settings } from "@/db/schema";
import { inArray } from "drizzle-orm";

/**
 * Default settings — every public/admin read falls back to these so the
 * site renders before the doctor has filled anything in. Real values are
 * written through the admin Settings panel.
 */
export const SETTINGS_DEFAULTS = {
  site_mode: "online", // "online" | "online+clinic"
  research_published: false,
  upi_id: "",
  upi_number: "",
  payee_name: "",
  clinic_address: "",
  maps_embed_url: "",
  notice_banner: "",
  contact_phone: "",
  contact_whatsapp: "",
  contact_email: "",
  social_links: [],
  consultation_hours: "",
  seo_title: "Dr. Seema — Homoeopathic Physician",
  seo_description:
    "Book online homoeopathy consultations with Dr. Seema. Gentle, individualised treatment for chronic and acute conditions.",
  medical_disclaimer:
    "Information on this site is for general awareness and is not a substitute for professional medical advice. Individual results vary.",
};

/** Read many settings at once, merged over defaults. */
export async function getSettings(keys = Object.keys(SETTINGS_DEFAULTS)) {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, keys));
  const found = Object.fromEntries(rows.map((r) => [r.key, r.value]));
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
