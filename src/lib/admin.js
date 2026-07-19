import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments, services } from "@/db/schema";
import { addMinutes, istToday, istWallToUtc, nowUtc } from "@/lib/time";

/** Dashboard counters. */
export async function getDashboardStats() {
  const now = nowUtc();
  const [pending] = await db
    .select({ n: sql`count(*)::int` })
    .from(appointments)
    .where(
      and(
        eq(appointments.status, "pending_payment"),
        sql`${appointments.utr} is not null`,
      ),
    );
  const [needsReview] = await db
    .select({ n: sql`count(*)::int` })
    .from(appointments)
    .where(eq(appointments.needsReview, true));
  const [confirmed] = await db
    .select({ n: sql`count(*)::int` })
    .from(appointments)
    .where(
      and(eq(appointments.status, "confirmed"), gte(appointments.startAt, now)),
    );
  return {
    pendingVerification: pending?.n ?? 0,
    needsReview: needsReview?.n ?? 0,
    upcomingConfirmed: confirmed?.n ?? 0,
  };
}

/** Appointments needing the doctor's attention (UTR submitted or flagged),
 * newest first. */
export async function getPendingVerifications() {
  return db
    .select({ appt: appointments, serviceTitle: services.title })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(
      sql`(${appointments.status} = 'pending_payment' and ${appointments.utr} is not null)
          or ${appointments.needsReview} = true`,
    )
    .orderBy(desc(appointments.utrSubmittedAt))
    .limit(50);
}

/** Upcoming confirmed appointments. */
export async function getUpcomingAppointments(limit = 50) {
  return db
    .select({ appt: appointments, serviceTitle: services.title })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(
      and(
        eq(appointments.status, "confirmed"),
        gte(appointments.startAt, nowUtc()),
      ),
    )
    .orderBy(appointments.startAt)
    .limit(limit);
}

/** Full appointments list for the management table. */
export async function listAppointments(limit = 200) {
  return db
    .select({ appt: appointments, serviceTitle: services.title })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .orderBy(desc(appointments.startAt))
    .limit(limit);
}

/**
 * Patient-management queue buckets (/admin/queue). One pass over confirmed +
 * completed appointments, joined with service titles:
 *   remaining  — confirmed, start still in the future (soonest first)
 *   delayed    — confirmed, start already passed while a consult overran; they
 *                are waiting in queue (longest-waiting first)
 *   completed  — completed, newest first (cap 50)
 */
export async function getQueueBuckets() {
  const now = nowUtc();
  const [remaining, delayed, completed] = await Promise.all([
    db
      .select({ appt: appointments, serviceTitle: services.title })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(and(eq(appointments.status, "confirmed"), gte(appointments.startAt, now)))
      .orderBy(appointments.startAt),
    db
      .select({ appt: appointments, serviceTitle: services.title })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(and(eq(appointments.status, "confirmed"), lt(appointments.startAt, now)))
      .orderBy(appointments.startAt),
    db
      .select({ appt: appointments, serviceTitle: services.title })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.status, "completed"))
      .orderBy(sql`coalesce(${appointments.completedAt}, ${appointments.startAt}) desc`)
      .limit(50),
  ]);
  return { remaining, delayed, completed };
}

/**
 * Transition a confirmed appointment to completed, stamping completed_at.
 * No auth/guard and no side effects (Sheet/Calendar) — those belong to the
 * server action wrapper (src/app/admin/actions/appointments.js). Kept here so
 * the transition is reusable and directly testable (scripts/e2e-admin-ops.mjs).
 * Returns the updated row, or undefined when the row wasn't confirmed. */
export async function completeAppointmentRow(id) {
  const now = nowUtc();
  const [row] = await db
    .update(appointments)
    .set({ status: "completed", completedAt: now, updatedAt: now })
    .where(and(eq(appointments.id, Number(id)), eq(appointments.status, "confirmed")))
    .returning();
  return row;
}

/**
 * "Running late": shift EVERY still-confirmed appointment in today's IST day
 * later by the same interval, preserving relative order so nobody is skipped.
 * Targets status='confirmed' with start_at inside today's IST day — which
 * intentionally includes the "delayed" bucket (start already passed, patient
 * still queued). Shifts start_at AND end_at by the same amount.
 *
 * The appointments_no_overlap EXCLUSION constraint (on confirmed/pending rows)
 * is NOT deferrable: shifting an earlier row forward could transiently overlap
 * the next one. So we update one row per statement in DESCENDING start_at order
 * (latest first — with an equal shift it can never overlap the row after it),
 * executed atomically via db.batch() (neon-http has no session transactions).
 * Returns the updated rows. */
export async function shiftTodaysAppointments(minutes) {
  if (![15, 30, 45].includes(minutes)) {
    throw new Error("minutes must be 15, 30 or 45");
  }
  const dayStart = istWallToUtc(istToday(), "00:00");
  const dayEnd = addMinutes(dayStart, 24 * 60);

  const rows = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.status, "confirmed"),
        gte(appointments.startAt, dayStart),
        lt(appointments.startAt, dayEnd),
      ),
    )
    .orderBy(desc(appointments.startAt));
  if (rows.length === 0) return [];

  const now = nowUtc();
  const stmts = rows.map((r) =>
    db
      .update(appointments)
      .set({
        startAt: addMinutes(new Date(r.startAt), minutes),
        endAt: addMinutes(new Date(r.endAt), minutes),
        updatedAt: now,
      })
      .where(eq(appointments.id, r.id))
      .returning(),
  );
  const results = await db.batch(stmts);
  return results.map((r) => r[0]);
}

/** Live database size + a soft percentage of Neon's 0.5 GB free tier, for
 * the storage meter / archival safety valve (plan §3.4). */
export async function getStorageUsage() {
  // neon-http's db.execute() returns a NeonHttpQueryResult ({ rows, ... }),
  // NOT an array — destructuring it as [row] yields undefined.
  const res = await db.execute(
    sql`select pg_database_size(current_database())::bigint as bytes`,
  );
  const row = res.rows?.[0];
  const bytes = Number(row?.bytes ?? 0);
  const limit = 512 * 1024 * 1024; // 0.5 GB
  return {
    bytes,
    mb: Math.round((bytes / (1024 * 1024)) * 10) / 10,
    percent: Math.round((bytes / limit) * 1000) / 10,
  };
}

export { and, desc, eq, gte, inArray, lt };
