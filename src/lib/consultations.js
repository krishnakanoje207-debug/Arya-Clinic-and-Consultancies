import { and, desc, eq, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import { z } from "zod";
import { db } from "@/db";
import { appointments } from "@/db/schema";

const note = z.string().trim().max(4000);

/** What the doctor records under "Start consultation". Every field is
 * optional — finishing a consult must never be blocked by an empty box.
 * Blank strings become null. nextAppointmentOn is an IST calendar date. */
export const consultationRecordSchema = z.object({
  reportedSymptoms: note.nullish(),
  medicinesPrescribed: note.nullish(),
  nextAppointmentOn: z
    .string()
    .trim()
    .refine(
      (s) => s === "" || (/^\d{4}-\d{2}-\d{2}$/.test(s) && DateTime.fromISO(s).isValid),
      "invalid date",
    )
    .nullish(),
});

/** Parse a record from the admin UI into column values, or null if invalid. */
export function parseConsultationRecord(input) {
  const parsed = consultationRecordSchema.safeParse(input || {});
  if (!parsed.success) return null;
  const { reportedSymptoms, medicinesPrescribed, nextAppointmentOn } = parsed.data;
  return {
    reportedSymptoms: reportedSymptoms || null,
    medicinesPrescribed: medicinesPrescribed || null,
    nextAppointmentOn: nextAppointmentOn || null,
  };
}

/** The next-appointment date from the patient's most recent completed
 * consultation ('yyyy-MM-dd'), or null. Only the latest consult counts: if
 * the doctor left the date blank there, no earlier date resurfaces. */
export async function latestNextAppointment(patientId) {
  if (!patientId) return null;
  const [row] = await db
    .select({ on: appointments.nextAppointmentOn })
    .from(appointments)
    .where(
      and(
        eq(appointments.patientId, Number(patientId)),
        eq(appointments.status, "completed"),
      ),
    )
    .orderBy(desc(sql`coalesce(${appointments.completedAt}, ${appointments.startAt})`))
    .limit(1);
  return row?.on || null;
}

/** Every patient's next-appointment date (from their latest completed
 * consultation) as Map<patientId, 'yyyy-MM-dd'> — for admin lists. */
export async function nextAppointmentsByPatient() {
  const res = await db.execute(sql`
    select distinct on (patient_id)
      patient_id, to_char(next_appointment_on, 'YYYY-MM-DD') as next_on
    from appointments
    where status = 'completed' and patient_id is not null
    order by patient_id, coalesce(completed_at, start_at) desc`);
  return new Map(
    (res.rows || []).filter((r) => r.next_on).map((r) => [Number(r.patient_id), r.next_on]),
  );
}
