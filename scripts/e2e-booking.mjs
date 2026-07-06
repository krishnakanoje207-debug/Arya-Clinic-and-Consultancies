/**
 * DB-level booking lifecycle E2E — proves the persistence layer + btree_gist
 * exclusion constraint work end to end against the live database:
 *   pick service → create hold → submit UTR → reject double-book (23P01) →
 *   admin confirm → clean up the test row.
 *
 *   node --env-file=.env scripts/e2e-booking.mjs
 *
 * Uses raw SQL (booking.js relies on the "@/" alias that raw Node can't
 * resolve); the DDL under test is identical to what booking.js exercises.
 */
import { neon, neonConfig } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
if (process.env.DATABASE_URL?.includes("db.localtest.me")) {
  neonConfig.fetchEndpoint = (host) => `http://${host}:4444/sql`;
}
const sql = neon(process.env.DATABASE_URL);
const P = "+919999000001"; // test-only phone; row deleted at the end

function log(ok, msg) {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) process.exitCode = 1;
}

// A far-future slot so it can never collide with real availability.
const start = "2030-01-01T05:30:00.000Z";
const token = randomUUID();

try {
  const [svc] = await sql`select id, fee_inr, duration_minutes from services where active = true order by id limit 1`;
  log(!!svc, `picked service #${svc?.id} (₹${svc?.fee_inr}, ${svc?.duration_minutes}m)`);

  const end = new Date(new Date(start).getTime() + svc.duration_minutes * 60000).toISOString();
  const hold = new Date(Date.now() + 15 * 60000).toISOString();

  const [appt] = await sql`
    insert into appointments (patient_name, patient_phone, service_id, mode, start_at, end_at,
      status, amount_inr, hold_expires_at, manage_token)
    values ('E2E Test', ${P}, ${svc.id}, 'online', ${start}, ${end},
      'pending_payment', ${svc.fee_inr}, ${hold}, ${token})
    returning id`;
  log(!!appt, `created hold #${appt.id} (pending_payment)`);

  await sql`update appointments set utr = 'E2ETEST123456', utr_submitted_at = now(), updated_at = now() where id = ${appt.id}`;
  const [withUtr] = await sql`select utr from appointments where id = ${appt.id}`;
  log(withUtr.utr === "E2ETEST123456", `submitted UTR (${withUtr.utr})`);

  // Double-book the exact slot → must be rejected by the exclusion constraint.
  let rejected = false;
  try {
    await sql`
      insert into appointments (patient_name, patient_phone, service_id, mode, start_at, end_at,
        status, amount_inr, hold_expires_at, manage_token)
      values ('E2E Dup', ${P}, ${svc.id}, 'online', ${start}, ${end},
        'pending_payment', ${svc.fee_inr}, ${hold}, ${randomUUID()})`;
  } catch (e) {
    rejected = e?.code === "23P01" || /exclusion/i.test(e?.message || "");
  }
  log(rejected, "double-booking the same slot rejected (23P01 exclusion)");

  await sql`update appointments set status = 'confirmed', updated_at = now() where id = ${appt.id}`;
  const [confirmed] = await sql`select status from appointments where id = ${appt.id}`;
  log(confirmed.status === "confirmed", `admin confirm → status ${confirmed.status}`);
} finally {
  const del = await sql`delete from appointments where patient_phone = ${P}`;
  console.log(`\ncleanup: removed ${del.length ?? 0} test row(s)`);
}
process.exit(process.exitCode || 0);
