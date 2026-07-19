-- Patient reviews (Phase 5): let a signed-in patient submit a review of their
-- treatment straight from their dashboard.
--
-- testimonials.patient_id: the patient who wrote this testimonial (null for the
-- doctor's own hand-entered testimonials). Nullable FK to patients(id). A
-- patient-submitted row lands with published = false and consent_confirmed =
-- true; the doctor still moderates/publishes it from the admin testimonials
-- editor exactly as before. Used to show a patient their one review already
-- exists (one review per patient). Keep src/db/schema.js in sync.

ALTER TABLE "testimonials"
  ADD COLUMN "patient_id" integer REFERENCES "patients" ("id");
