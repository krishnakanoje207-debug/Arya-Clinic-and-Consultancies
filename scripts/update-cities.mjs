/**
 * Reorder the seeded city pairs to "Pune" before "Nagpur" in a live database.
 *
 * The site reads this copy from the DB, so editing seed.js / content.js only
 * changes the no-DB fallbacks — an already-seeded database keeps serving the
 * old order until this runs. Same pattern as scripts/update-templates-razorpay.mjs.
 *
 * Substring replacement, not whole-row rewrites: anything the doctor has since
 * edited around these phrases is preserved, and re-running is a no-op.
 *
 * The Terms jurisdiction clause ("courts of Nagpur, Maharashtra") names a
 * single legal venue rather than a list of clinic locations, and lives in
 * messages/*.json rather than the DB, so nothing here touches it.
 *
 *   node --env-file=.env          scripts/update-cities.mjs          # dry run
 *   node --env-file=.env          scripts/update-cities.mjs --apply
 *   node --env-file=.env.prod.local scripts/update-cities.mjs --apply
 */
import { neon, neonConfig } from "@neondatabase/serverless";

if (process.env.DATABASE_URL?.includes("db.localtest.me")) {
  neonConfig.fetchEndpoint = (host) => `http://${host}:4444/sql`;
}

const APPLY = process.argv.includes("--apply");
const sql = neon(process.env.DATABASE_URL);

const PAIRS = [
  ["Nagpur, Pune, and", "Pune, Nagpur, and"],
  ["Nagpur and Pune", "Pune and Nagpur"],
  ["Nagpur & Pune", "Pune & Nagpur"],
  ["Nagpur · Pune", "Pune · Nagpur"],
  ["नागपुर, पुणे", "पुणे, नागपुर"],
  ["नागपुर और पुणे", "पुणे और नागपुर"],
];

const swap = (text) => {
  let out = text;
  for (const [from, to] of PAIRS) out = out.split(from).join(to);
  return out;
};

let changes = 0;

/* ---------- profile: bio, bio_hi, stats (jsonb) ---------- */
const [p] = await sql`select id, bio, bio_hi, stats from profile limit 1`;
if (!p) {
  console.log("no profile row — nothing to do");
} else {
  const next = {
    bio: p.bio ? swap(p.bio) : p.bio,
    bio_hi: p.bio_hi ? swap(p.bio_hi) : p.bio_hi,
    stats: swap(JSON.stringify(p.stats ?? [])),
  };
  const dirty =
    next.bio !== p.bio ||
    next.bio_hi !== p.bio_hi ||
    next.stats !== JSON.stringify(p.stats ?? []);

  if (dirty) {
    changes += 1;
    console.log("profile: bio/bio_hi/stats need reordering");
    if (APPLY) {
      await sql`
        update profile
        set bio = ${next.bio},
            bio_hi = ${next.bio_hi},
            stats = ${next.stats}::jsonb
        where id = ${p.id}
      `;
      console.log("  updated");
    }
  } else {
    console.log("profile: already correct");
  }
}

/* ---------- settings: any value carrying a city pair ---------- */
const rows = await sql`select key, value from settings`;
for (const r of rows) {
  if (typeof r.value !== "string") continue;
  const next = swap(r.value);
  if (next === r.value) continue;
  changes += 1;
  console.log(`settings.${r.key}: needs reordering`);
  if (APPLY) {
    // settings.value is jsonb, so the replacement has to go back as encoded
    // JSON. Writing the bare string makes Postgres try to parse the sentence
    // itself as JSON and fail on the first word.
    await sql`
      update settings set value = ${JSON.stringify(next)}::jsonb
      where key = ${r.key}
    `;
    console.log("  updated");
  }
}

console.log(
  changes === 0
    ? "\nNothing to change."
    : APPLY
      ? `\n${changes} item(s) updated.`
      : `\n${changes} item(s) would change. Re-run with --apply to write.`,
);
process.exit(0);
