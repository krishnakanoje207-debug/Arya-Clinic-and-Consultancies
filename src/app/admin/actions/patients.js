"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { dispatchFollowUpNudge } from "@/lib/notify";

async function guard() {
  const s = await requireAdmin();
  if (!s.authed) throw new Error("Unauthorized");
}

/** Issue a fresh dashboard link for a patient (invalidates the old one —
 * e.g. if it was shared by mistake). */
export async function regeneratePatientLink(id) {
  await guard();
  await db
    .update(patients)
    .set({ dashboardToken: randomUUID(), updatedAt: new Date() })
    .where(eq(patients.id, Number(id)));
  revalidatePath("/admin/patients");
}

/** Send a patient a "time for a follow-up?" nudge over email/SMS (whichever is
 * available). Returns { ok, channels } on send; when no channel could send
 * (no email + SMS unconfigured) returns { ok:false, reason:"no_channel" } so
 * the UI can point the doctor at WhatsApp instead. */
export async function sendFollowUpNudge(patientId) {
  await guard();
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, Number(patientId)));
  if (!patient) return { ok: false, reason: "not_found" };
  const channels = await dispatchFollowUpNudge(patient);
  if (!channels.email && !channels.sms) {
    return { ok: false, reason: "no_channel" };
  }
  return { ok: true, channels };
}
