import { db } from "@/db";
import { patients } from "@/db/schema";
import { nowUtc } from "@/lib/time";

/** Normalize a phone to its bare last-10-digits form — JS mirror of the SQL
 * in drizzle/0007_patients.sql. Strips every non-digit, then keeps the last
 * 10 digits (drops +91 / leading-0 prefixes) so all spellings of one number
 * collapse to a single patient. */
export function normalizePhone(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d;
}

/** Find-or-create the patient for a booking, keyed by normalized phone.
 * Name + updatedAt are always refreshed; email only when a non-empty one was
 * given (a later booking without an email must not wipe an earlier one). The
 * unique index on phone makes this race-safe: a concurrent insert loses the
 * conflict and falls through to the UPDATE. Returns the patient row. */
export async function upsertPatientForBooking({ name, phone, email }) {
  const normalized = normalizePhone(phone);
  const set = { name, updatedAt: nowUtc() };
  if (email) set.email = email;
  const [row] = await db
    .insert(patients)
    .values({ name, phone: normalized, email: email || null })
    .onConflictDoUpdate({ target: patients.phone, set })
    .returning();
  return row;
}
