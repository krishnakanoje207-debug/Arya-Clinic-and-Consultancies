/**
 * Remove {meet_link} from the `confirmed` message templates in a live database.
 *
 * The confirmation goes out the moment payment lands, and a Google Meet URL
 * never expires — so the raw link there is a standing invitation to the
 * doctor's room, days before the consult. It stays in `reminder`, the message
 * that actually tells the patient to join. The confirmation keeps
 * {dashboard_link}, and the dashboard reveals Join only inside the
 * appointment's window (src/lib/meeting.js).
 *
 * seedTemplates() early-returns when the table already has rows, so this is
 * the ONLY way the change reaches a database that has been seeded before —
 * it is a required deploy step, not an optional cleanup.
 *
 * Surgical + idempotent: strips only the placeholder (and any spaces or tabs
 * directly after it) from the `confirmed` rows, so anything the doctor has
 * written around it survives. Rows without the placeholder are left untouched.
 *
 *   node --env-file=.env            scripts/update-templates-meet.mjs          # dry run
 *   node --env-file=.env.prod.local scripts/update-templates-meet.mjs --apply
 */
import { neon, neonConfig } from "@neondatabase/serverless";

if (process.env.DATABASE_URL?.includes("db.localtest.me")) {
  neonConfig.fetchEndpoint = (host) => `http://${host}:4444/sql`;
}

const APPLY = process.argv.includes("--apply");
const sql = neon(process.env.DATABASE_URL);

// Horizontal whitespace only: \s would swallow the newline after the
// placeholder and collapse a paragraph break in a body the doctor edited.
const MEET_LINK = /\{meet_link\}[^\S\r\n]*/g;

const rows = await sql`
  select id, event, channel, body
  from message_templates
  where event = 'confirmed'
  order by channel
`;

if (!rows.length) {
  console.log("no 'confirmed' templates found — nothing to do");
  process.exit(0);
}

let changed = 0;
for (const r of rows) {
  const next = r.body.replace(MEET_LINK, "");
  if (next === r.body) {
    console.log(`${r.event}/${r.channel}: no {meet_link} — unchanged`);
    continue;
  }
  changed++;
  console.log(`\n${r.event}/${r.channel}:`);
  console.log("  before:", JSON.stringify(r.body));
  console.log("  after :", JSON.stringify(next));
  if (APPLY) {
    await sql`update message_templates set body = ${next} where id = ${r.id}`;
  }
}

if (!changed) {
  console.log("\nAlready clean — nothing to change.");
} else if (APPLY) {
  console.log(`\nupdated ${changed} row(s).`);
} else {
  console.log(`\nDry run (${changed} row(s) would change). Re-run with --apply to write.`);
}

