import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments, services } from "@/db/schema";
import { nowUtc } from "@/lib/time";

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
