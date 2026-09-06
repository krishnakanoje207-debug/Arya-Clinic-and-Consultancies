/**
 * DB-level patient-review E2E — proves the review persistence layer works end to
 * end against the live local database by driving the REAL library function
 * (src/lib/reviews.js), not a re-implementation:
 *   create a patient → patient submits a review → assert an UNPUBLISHED
 *   testimonials row lands tagged with patient_id → assert a second submission is
 *   rejected (already_submitted) → assert a bad token is rejected (not_found) →
 *   clean up the test rows.
 *
 *   node --env-file=.env scripts/e2e-review.mjs
 *
 * Imports the app modules through the "@/" alias via scripts/alias-loader.mjs,
 * so the exact function the UI calls is under test. db/index.js auto-points the
 * neon driver at the local proxy when DATABASE_URL targets db.localtest.me.
 */
import { register } from "node:module";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

register("./scripts/alias-loader.mjs", pathToFileURL("./").href);

const { eq, inArray } = await import("drizzle-orm");
const { db } = await import("@/db");
const { testimonials, patients } = await import("@/db/schema");
const { createPatientReview, reviewExistsForPatient } = await import(
  "@/lib/reviews"
);

const NORM = "9999000003"; // test-only phone (last 10 digits); rows deleted below

function log(ok, msg) {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) process.exitCode = 1;
}

let patientId = null;
try {
  // --- Setup: a test patient (mirrors upsertPatientForBooking's insert) ---
  const token = randomUUID();
  const [patient] = await db
    .insert(patients)
    .values({ name: "Review E2E", nameKey: "review e2e", phone: NORM, dashboardToken: token })
    .returning();
  patientId = patient.id;
  log(!!patient, `created patient #${patient.id}`);

  log(
    !(await reviewExistsForPatient(patient.id)),
    `no review on file before submission`,
  );

  // --- Patient submits a review: happy path (real createPatientReview) ---
  const res = await createPatientReview({
    token,
    displayName: "R. K.",
    rating: 5,
    text: "The treatment has helped me a great deal over the past few months.",
    consentConfirmed: true,
  });
  log(res.ok, `review accepted (ok=${res.ok})`);
  log(res.review?.published === false, `row lands UNPUBLISHED`);
  log(res.review?.patientId === patient.id, `row tagged with patient_id (${res.review?.patientId})`);
  log(res.review?.rating === 5, `rating recorded (${res.review?.rating})`);
  log(res.review?.patientName === "R. K.", `display name stored as patient_name (${res.review?.patientName})`);
  log(res.review?.consentConfirmed === true, `consent recorded`);

  log(await reviewExistsForPatient(patient.id), `review now exists for patient`);

  // --- Rejection: duplicate submission (one review per patient) ---
  const dup = await createPatientReview({
    token,
    displayName: "R. K.",
    rating: 4,
    text: "A second review that should be rejected as a duplicate submission.",
    consentConfirmed: true,
  });
  log(!dup.ok && dup.reason === "already_submitted", `duplicate submission rejected (${dup.reason})`);

  // --- Rejection: unknown token resolves to no patient ---
  const bad = await createPatientReview({
    token: randomUUID(),
    displayName: "Nobody",
    rating: 3,
    text: "This review uses a token that maps to no patient at all.",
    consentConfirmed: true,
  });
  log(!bad.ok && bad.reason === "not_found", `unknown token rejected (${bad.reason})`);

  // --- Rejection: invalid payload (missing consent) ---
  const noConsent = await createPatientReview({
    token,
    displayName: "R. K.",
    rating: 5,
    text: "A review without the consent checkbox ticked must be rejected.",
    consentConfirmed: false,
  });
  log(!noConsent.ok && noConsent.reason === "invalid", `missing consent rejected (${noConsent.reason})`);
} finally {
  if (patientId != null) {
    const del = await db
      .delete(testimonials)
      .where(eq(testimonials.patientId, patientId))
      .returning();
    const delp = await db
      .delete(patients)
      .where(inArray(patients.id, [patientId]))
      .returning();
    console.log(
      `\ncleanup: removed ${del.length} testimonial(s), ${delp.length} patient row(s)`,
    );
  }
}
process.exit(process.exitCode || 0);
