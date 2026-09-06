/**
 * Explain why an appointment is missing from a patient's dashboard.
 *
 * The dashboard lists appointments by patient_id. If a booking landed on a
 * different patient row than the dashboard token the person holds, it is
 * invisible to them — which is how someone pays twice for the same slot.
 * This prints every patient record on a number, every appointment attached
 * to each, and every appointment on that number attached to NOTHING.
 *
 *   node --env-file=.env            scripts/diagnose-patient.mjs 9876543210
 *   node --env-file=.env.prod.local scripts/diagnose-patient.mjs 9876543210
 *
 * Read-only: it never writes.
 */
import { neon, neonConfig } from "@neondatabase/serverless";

if (process.env.DATABASE_URL?.includes("db.localtest.me")) {
  neonConfig.fetchEndpoint = (host) => `http://${host}:4444/sql`;
}

const arg = process.argv[2];
if (!arg) {
  console.error("usage: node --env-file=<env> scripts/diagnose-patient.mjs <phone>");
  process.exit(1);
}
const norm = (s) => {
  const d = String(s).replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d;
};
const phone = norm(arg);
const sql = neon(process.env.DATABASE_URL);

const people = await sql`
  select id, name, phone, email, dashboard_token, created_at
  from patients where phone = ${phone} order by id`;

console.log(`\nPhone ${phone} — ${people.length} patient record(s)\n`);
if (people.length > 1) {
  console.log("  >> MORE THAN ONE RECORD. Each has its own dashboard link, and");
  console.log("     each link shows ONLY its own appointments.\n");
}

for (const p of people) {
  console.log(`  Patient #${p.id}  "${p.name}"  ${p.email || "(no email)"}`);
  console.log(`    dashboard: /patient/${p.dashboard_token}`);
  const appts = await sql`
    select id, start_at, status, amount_inr, razorpay_payment_id, meeting_link
    from appointments where patient_id = ${p.id} order by start_at`;
  if (!appts.length) console.log("    (no appointments on this record)");
  for (const a of appts) {
    console.log(
      `    #${a.id}  ${new Date(a.start_at).toISOString()}  ${a.status}` +
        `  Rs.${a.amount_inr}  ${a.razorpay_payment_id ? "PAID " + a.razorpay_payment_id : "no payment id"}`,
    );
  }
  console.log("");
}

// Appointments on this number that no dashboard can ever show.
const orphans = await sql`
  select id, patient_name, start_at, status, patient_id, razorpay_payment_id
  from appointments
  where regexp_replace(patient_phone, '\D', '', 'g') like ${"%" + phone}
    and patient_id is null
  order by start_at`;
if (orphans.length) {
  console.log(`  >> ${orphans.length} appointment(s) with NO patient_id — invisible on every dashboard:`);
  for (const a of orphans) {
    console.log(
      `     #${a.id}  "${a.patient_name}"  ${new Date(a.start_at).toISOString()}  ${a.status}` +
        `  ${a.razorpay_payment_id ? "PAID " + a.razorpay_payment_id : "no payment id"}`,
    );
  }
} else {
  console.log("  No orphaned (patient_id IS NULL) appointments on this number.");
}
