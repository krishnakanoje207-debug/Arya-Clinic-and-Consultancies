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
