/**
 * Bring the SMS message templates inside GSM-7 in a live database.
 *
 * The rupee sign and en/em dashes are not in the GSM-7 alphabet, and a single
 * such character forces the WHOLE message into UCS-2 — 67 characters per
 * segment instead of 153. Measured on the live templates with placeholders
 * filled, that was costing an extra segment on most messages and three extra
 * on the longest ones: one patient journey ran ~17 segments where ~10 will do.
 *
 * SMS rows only. Email keeps ₹ and proper dashes.
 *
 * seedTemplates() early-returns when the table already has rows, so this is
 * the ONLY way the change reaches a database that has been seeded before —
 * it is a required deploy step, not an optional cleanup.
 *
 * Idempotent: rows already inside GSM-7 are left untouched.
 *
 *   node --env-file=.env            scripts/update-templates-gsm7.mjs          # dry run
 *   node --env-file=.env.prod.local scripts/update-templates-gsm7.mjs --apply
 */
import { neon, neonConfig } from "@neondatabase/serverless";

if (process.env.DATABASE_URL?.includes("db.localtest.me")) {
  neonConfig.fetchEndpoint = (host) => `http://${host}:4444/sql`;
}

const APPLY = process.argv.includes("--apply");
const sql = neon(process.env.DATABASE_URL);

const gsm7 = (s) => s.replace(/₹/g, "Rs.").replace(/[—–]/g, "-");

const rows = await sql`
  select id, event, body, body_hi
  from message_templates
  where channel = 'sms'
  order by event
`;

let changed = 0;
for (const r of rows) {
  const body = gsm7(r.body);
  const bodyHi = r.body_hi ? gsm7(r.body_hi) : r.body_hi;
  if (body === r.body && bodyHi === r.body_hi) continue;
  changed++;
  console.log(`\n${r.event}:`);
  console.log("  before:", JSON.stringify(r.body));
  console.log("  after :", JSON.stringify(body));
  if (APPLY) {
    await sql`
      update message_templates
      set body = ${body}, body_hi = ${bodyHi}
      where id = ${r.id}
    `;
  }
}

if (!rows.length) {
  console.log("no sms templates found — nothing to do");
} else if (!changed) {
  console.log("Already inside GSM-7 — nothing to change.");
} else if (APPLY) {
  console.log(`\nupdated ${changed} row(s).`);
} else {
  console.log(`\nDry run (${changed} row(s) would change). Re-run with --apply to write.`);
}
