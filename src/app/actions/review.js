"use server";

import { createPatientReview } from "@/lib/reviews";

/** Record a patient's review of their treatment (mirrors submitMedicationPayment
 * -Action). Thin wrapper over the lib fn — all validation, token resolution and
 * the one-review-per-patient guard live there. The row lands UNPUBLISHED; the
 * doctor moderates/publishes it from the admin testimonials editor. */
export async function submitPatientReview(formData) {
  return createPatientReview({
    token: formData.get("token"),
    displayName: formData.get("displayName"),
    text: formData.get("text"),
    rating: formData.get("rating"),
    consentConfirmed: formData.get("consent") === "on",
  });
}
