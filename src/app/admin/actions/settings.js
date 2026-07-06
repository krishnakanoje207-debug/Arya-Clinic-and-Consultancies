"use server";

import { revalidatePath } from "next/cache";
import { setSetting } from "@/lib/settings";
import { requireAdmin } from "@/lib/admin-auth";
import { sendSms, smsConfigured } from "@/lib/notify/sms";

/** Persist the Settings form. Text keys are stored verbatim; the two
 * toggles are coerced to booleans / the site_mode enum. */
export async function saveSettings(prevState, formData) {
  const s = await requireAdmin();
  if (!s.authed) return { ok: false, error: "Unauthorized" };

  const textKeys = [
    "brand_name",
    "brand_tagline",
    "upi_id",
    "upi_number",
    "payee_name",
    "clinic_address",
    "maps_embed_url",
    "notice_banner",
    "contact_phone",
    "contact_whatsapp",
    "contact_email",
    "consultation_hours",
    "seo_title",
    "seo_description",
    "medical_disclaimer",
  ];
  for (const k of textKeys) {
    await setSetting(k, String(formData.get(k) ?? ""));
  }

  // Clinic mode toggle → site_mode enum.
  await setSetting(
    "site_mode",
    formData.get("clinic_mode") ? "online+clinic" : "online",
  );
  // Research publish toggle.
  await setSetting("research_published", Boolean(formData.get("research_published")));

  // Cancellation cutoff (hours) — numeric, clamped to a sane range.
  const cutoff = Number(formData.get("cancel_cutoff_hours"));
  await setSetting(
    "cancel_cutoff_hours",
    Number.isFinite(cutoff) ? Math.min(72, Math.max(0, cutoff)) : 4,
  );

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Admin ▸ Settings "send test SMS" — verifies the textbee Android
 * gateway end-to-end before relying on it for booking messages. */
export async function sendTestSms(phone) {
  const s = await requireAdmin();
  if (!s.authed) return { ok: false, error: "Unauthorized" };
  if (!smsConfigured()) {
    return {
      ok: false,
      error:
        "Gateway not configured — set TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID env vars.",
    };
  }
  const clean = String(phone || "").trim();
  if (!/^\+?[0-9][0-9 \-]{5,17}$/.test(clean)) {
    return { ok: false, error: "Enter a valid phone number." };
  }
  try {
    await sendSms({
      to: clean,
      message: "Test SMS from the Dr. Seema website — gateway is working.",
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Send failed: ${err.message}` };
  }
}
