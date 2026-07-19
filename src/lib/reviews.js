import { eq } from "drizzle-orm";
import { db } from "@/db";
import { patients, testimonials } from "@/db/schema";
import { patientReviewSchema } from "@/lib/validation";

/** True when this patient has already submitted a review (one per patient).
 * The dashboard uses it to show the thank-you note instead of the form. */
export async function reviewExistsForPatient(patientId) {
  const [row] = await db
    .select({ id: testimonials.id })
    .from(testimonials)
    .where(eq(testimonials.patientId, Number(patientId)));
  return !!row;
}

/**
 * A patient submits a review of their treatment from their private dashboard.
 * Validates the payload, resolves the private token to a patient, then inserts
 * an UNPUBLISHED testimonials row tagged with patient_id — the doctor still
 * moderates/publishes it from the admin testimonials editor. Enforces one review
 * per patient. Returns {ok:false, reason} for every rejection so the action
 * layer can surface a specific message; nothing is ever auto-published.
 */
export async function createPatientReview(payload) {
  const parsed = patientReviewSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { token, displayName, text, rating } = parsed.data;

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.dashboardToken, token));
  if (!patient) return { ok: false, reason: "not_found" };

  if (await reviewExistsForPatient(patient.id)) {
    return { ok: false, reason: "already_submitted" };
  }

  const [row] = await db
    .insert(testimonials)
    .values({
      patientId: patient.id,
      patientName: displayName,
      text,
      rating,
      consentConfirmed: true,
      published: false,
    })
    .returning();

  return { ok: true, review: row };
}
