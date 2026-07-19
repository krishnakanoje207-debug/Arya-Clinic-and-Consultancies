import { z } from "zod";

/**
 * Input validation for every public-facing write. Server actions are
 * public HTTP endpoints — nothing here trusts the client-side form.
 */

const trimmed = (max) => z.string().trim().min(1).max(max);

export const patientSchema = z.object({
  name: trimmed(120),
  // Indian numbers with optional +country prefix; tolerant of spaces/dashes.
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9 \-]{5,17}$/, "invalid phone"),
  email: z.union([z.literal(""), z.string().trim().email().max(254)]).nullish(),
  // Patient's own description of the problem, collected at booking.
  note: trimmed(2000),
});

export const bookingInputSchema = z.object({
  serviceId: z.coerce.number().int().positive(),
  mode: z.enum(["online", "clinic"]).nullish(),
  startAtIso: z.string().datetime({ offset: true }).or(z.string().datetime()),
  patient: patientSchema,
});

/** UTR / UPI transaction refs are alphanumeric, typically 12 digits. */
export const utrSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9\-]{6,40}$/, "invalid utr");

/** Intake form: fixed whitelist of case-taking fields, bounded lengths —
 * prevents arbitrary/oversized JSON landing in the jsonb column. */
export const intakeSchema = z
  .object({
    chiefComplaint: z.string().trim().max(2000).optional(),
    duration: z.string().trim().max(500).optional(),
    better: z.string().trim().max(1000).optional(),
    worse: z.string().trim().max(1000).optional(),
    history: z.string().trim().max(2000).optional(),
    medications: z.string().trim().max(1000).optional(),
    lifestyle: z.string().trim().max(2000).optional(),
  })
  .strict();

export const contactSchema = z.object({
  name: trimmed(120),
  message: trimmed(5000),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.union([z.literal(""), z.string().trim().email().max(254)]).optional(),
});

/** Manage tokens are UUIDs we generated — reject anything else early. */
export const tokenSchema = z.string().uuid();

/** Patient paying for a medication order: which order, the enabled duration
 * they picked (15/30/60 days), shipping address and their UPI transaction ref.
 * The server re-checks durationDays against the order's own options. */
export const medicationPaymentSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  durationDays: z.coerce
    .number()
    .int()
    .refine((d) => d === 15 || d === 30 || d === 60, "invalid duration"),
  address: trimmed(500),
  utr: utrSchema,
});

/** Patient reviewing their treatment from their dashboard. token identifies the
 * patient (private dashboard token); displayName may be initials for privacy;
 * consent must be affirmatively checked before it can be published. Lands as an
 * UNPUBLISHED testimonials row — the doctor moderates/publishes as usual. */
export const patientReviewSchema = z.object({
  token: tokenSchema,
  displayName: z.string().trim().min(2).max(80),
  text: z.string().trim().min(20).max(1500),
  rating: z.coerce.number().int().min(1).max(5),
  consentConfirmed: z.literal(true),
});

/** Quiz lead: only the slug, phone and raw answers are trusted from the
 * client. The server recomputes score/result from the answers against the
 * quiz definition, so no score is accepted from the browser. Answers are
 * bounded (index 0–3, at most one per question) to keep the payload sane. */
export const quizLeadSchema = z.object({
  quizSlug: z.string().trim().min(1).max(64),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9 \-]{5,17}$/, "invalid phone"),
  answers: z.array(z.number().int().min(0).max(3)).min(1).max(30),
});
