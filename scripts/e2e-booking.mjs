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
const P = "+919999000001"; // test-only phone; rows deleted at the end
const NORM = "9999000001"; // normalized form (last 10 digits) — see src/lib/patients.js

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

  // Mirror src/lib/patients.js upsertPatientForBooking: find-or-create the
  // patient keyed by normalized phone, then link the appointment to it.
  const [pat] = await sql`
    insert into patients (name, phone) values ('E2E Test', ${NORM})
    on conflict (phone) do update set name = excluded.name, updated_at = now()
    returning id, dashboard_token`;
  log(!!pat, `upserted patient #${pat?.id}`);

  const [appt] = await sql`
    insert into appointments (patient_name, patient_phone, problem_note, service_id, mode, start_at, end_at,
      status, amount_inr, hold_expires_at, manage_token, patient_id)
    values ('E2E Test', ${P}, 'E2E automated test booking', ${svc.id}, 'online', ${start}, ${end},
      'pending_payment', ${svc.fee_inr}, ${hold}, ${token}, ${pat.id})
    returning id, patient_id`;
  log(!!appt, `created hold #${appt.id} (pending_payment)`);
  log(appt.patient_id != null, `appointment linked to patient_id ${appt.patient_id}`);

  const [pc1] = await sql`select count(*)::int as n from patients where phone = ${NORM}`;
  log(pc1.n === 1, `exactly one patient row for phone (${pc1.n})`);

  await sql`update appointments set utr = 'E2ETEST123456', utr_submitted_at = now(), updated_at = now() where id = ${appt.id}`;
  const [withUtr] = await sql`select utr from appointments where id = ${appt.id}`;
  log(withUtr.utr === "E2ETEST123456", `submitted UTR (${withUtr.utr})`);

  // Booking the SAME phone again must reuse the patient, not create a second.
  const [pat2] = await sql`
    insert into patients (name, phone) values ('E2E Dup', ${NORM})
    on conflict (phone) do update set name = excluded.name, updated_at = now()
    returning id`;
  log(pat2.id === pat.id, `same phone re-upsert returns same patient #${pat2.id}`);
  const [pc2] = await sql`select count(*)::int as n from patients where phone = ${NORM}`;
  log(pc2.n === 1, `still exactly one patient row after re-upsert (${pc2.n})`);

  // Double-book the exact slot → must be rejected by the exclusion constraint.
  let rejected = false;
  try {
    await sql`
      insert into appointments (patient_name, patient_phone, service_id, mode, start_at, end_at,
        status, amount_inr, hold_expires_at, manage_token, patient_id)
      values ('E2E Dup', ${P}, ${svc.id}, 'online', ${start}, ${end},
        'pending_payment', ${svc.fee_inr}, ${hold}, ${randomUUID()}, ${pat.id})`;
  } catch (e) {
    rejected = e?.code === "23P01" || /exclusion/i.test(e?.message || "");
  }
  log(rejected, "double-booking the same slot rejected (23P01 exclusion)");

  await sql`update appointments set status = 'confirmed', updated_at = now() where id = ${appt.id}`;
  const [confirmed] = await sql`select status from appointments where id = ${appt.id}`;
  log(confirmed.status === "confirmed", `admin confirm → status ${confirmed.status}`);
} finally {
  const del = await sql`delete from appointments where patient_phone = ${P}`;
  const delp = await sql`delete from patients where phone = ${NORM}`;
  console.log(
    `\ncleanup: removed ${del.length ?? 0} appointment row(s), ${delp.length ?? 0} patient row(s)`,
  );
}
process.exit(process.exitCode || 0);
