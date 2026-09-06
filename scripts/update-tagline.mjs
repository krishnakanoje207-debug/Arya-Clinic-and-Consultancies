/**
 * Trim the doctor's hero tagline to its first half in a live database.
 *
 * "Modern & classical homoeopathy — healing starts here" becomes
 * "Modern & classical homoeopathy". The clinic's own brand tagline ("Healing
 * starts here", shown under the ARYA mark in the header) is a separate
 * setting and is deliberately untouched.
 *
 * Guarded: only rewrites a value that still matches the seeded text exactly,
 * so anything the doctor has edited herself is left alone. Idempotent.
 *
 *   node --env-file=.env            scripts/update-tagline.mjs          # dry run
 *   node --env-file=.env.prod.local scripts/update-tagline.mjs --apply
 */
import { neon, neonConfig } from "@neondatabase/serverless";

if (process.env.DATABASE_URL?.includes("db.localtest.me")) {
  neonConfig.fetchEndpoint = (host) => `http://${host}:4444/sql`;
}

const APPLY = process.argv.includes("--apply");
const sql = neon(process.env.DATABASE_URL);

const EN_OLD = "Modern & classical homoeopathy — healing starts here";
const EN_NEW = "Modern & classical homoeopathy";
const HI_OLD = "आधुनिक एवं शास्त्रीय होम्योपैथी — यहीं से आरोग्य आरंभ";
const HI_NEW = "आधुनिक एवं शास्त्रीय होम्योपैथी";

const [p] = await sql`select id, tagline, tagline_hi from profile limit 1`;

if (!p) {
  console.log("no profile row — nothing to do");
  process.exit(0);
}

const nextEn = p.tagline === EN_OLD ? EN_NEW : p.tagline;
const nextHi = p.tagline_hi === HI_OLD ? HI_NEW : p.tagline_hi;

if (nextEn === p.tagline && nextHi === p.tagline_hi) {
  console.log("tagline: already trimmed (or edited by hand) — nothing to change");
  process.exit(0);
}

console.log("tagline    :", JSON.stringify(p.tagline), "->", JSON.stringify(nextEn));
console.log("tagline_hi :", JSON.stringify(p.tagline_hi), "->", JSON.stringify(nextHi));

if (APPLY) {
  await sql`
    update profile set tagline = ${nextEn}, tagline_hi = ${nextHi}
    where id = ${p.id}
  `;
  console.log("\nupdated.");
} else {
  console.log("\nDry run. Re-run with --apply to write.");
}

process.exit(0);
