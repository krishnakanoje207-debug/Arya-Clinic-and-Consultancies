import { db } from "@/db";
import { patients } from "@/db/schema";
import { nowUtc } from "@/lib/time";

/** Normalize a phone to its bare last-10-digits form — JS mirror of the SQL
 * in drizzle/0007_patients.sql. Strips every non-digit, then keeps the last
 * 10 digits (drops +91 / leading-0 prefixes) so all spellings of one number
 * collapse to a single contact. */
export function normalizePhone(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d;
}

/** Normalize a name to its identity form — JS mirror of the SQL in
 * drizzle/0013_patient_identity.sql. Trimmed, inner whitespace runs
 * collapsed, lowercased, so "  Ravi   Kumar " and "ravi kumar" are the same
 * person while "Ravi Kumar" and "Meera Kumar" are not. */
export function normalizeName(raw) {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Find-or-create the patient for a booking, keyed by normalized phone AND
 * normalized name. One phone can carry several people — booking for a child
 * or a parent on your own number gives THEM their own row and their own
 * dashboard token, instead of merging their health record into yours.
 *
 * The stored name is refreshed (capitalisation may differ) but never changes
 * identity, since name_key is part of the key. Email is only written when a
 * non-empty one was given: a later booking without an email must not wipe an
 * earlier one. The unique index on (phone, name_key) makes this race-safe —
 * a concurrent insert loses the conflict and falls through to the UPDATE.
 * Returns the patient row. */
export async function upsertPatientForBooking({ name, phone, email }) {
  const normalized = normalizePhone(phone);
  const nameKey = normalizeName(name);
  const set = { name, updatedAt: nowUtc() };
  if (email) set.email = email;
  const [row] = await db
    .insert(patients)
    .values({ name, nameKey, phone: normalized, email: email || null })
    .onConflictDoUpdate({
      target: [patients.phone, patients.nameKey],
      set,
    })
    .returning();
  return row;
}
