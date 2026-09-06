/**
 * Follow-up bookings must land on the dashboard the patient already holds.
 *
 * Regression guard for a bug that charged patients twice: `?p=<token>` only
 * PREFILLED the booking form, so the patient was re-derived from whatever was
 * typed. Any variation in the name or number produced a different patient row
 * with a different dashboard token — the magic link they already had never
 * showed the appointment they had just paid for, so they booked and paid
 * again. createBooking now binds to the token when one is supplied.
 *
 * The token is withheld when the patient says the consult is for someone
 * else, so that path must still create a separate record (asserted below).
 *
 *   node --env-file=.env scripts/e2e-followup.mjs
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";
register("./scripts/alias-loader.mjs", pathToFileURL("./").href);
const { eq, inArray } = await import("drizzle-orm");
const { db } = await import("@/db");
const { appointments, patients, availabilityRules, services } = await import("@/db/schema");
const { createBooking } = await import("@/lib/booking");
const { istToday, istWallToUtc } = await import("@/lib/time");
const { DateTime } = await import("luxon");

const PHONE = "9000066666", ALT = "9000077777";
let pass = true;
const log = (ok, m) => { if (!ok) pass = false; console.log(`${ok ? "PASS" : "FAIL"}  ${m}`); };

for (const ph of [PHONE, ALT]) {
  await db.delete(appointments).where(eq(appointments.patientPhone, ph));
  await db.delete(patients).where(eq(patients.phone, ph));
}
const [svc] = await db.select().from(services).limit(1);
const day = DateTime.fromISO(istToday(), { zone: "Asia/Kolkata" }).plus({ days: 23 });
const [rule] = await db.insert(availabilityRules).values({
  weekday: day.weekday % 7, startTime: "10:00", endTime: "16:00",
  slotLengthMinutes: 30, mode: "online", active: true,
}).returning();

const book = (name, phone, at, token) => createBooking({
  serviceId: svc.id, mode: "online",
  startAtIso: istWallToUtc(day.toISODate(), at).toISOString(),
  patient: { name, phone, email: "", note: "n" }, patientToken: token,
});
// keep the 2-hold cap from blocking us
const clearHolds = () => db.update(appointments)
  .set({ status: "confirmed" }).where(eq(appointments.status, "pending_payment"));

const first = await book("Ramesh Patil", PHONE, "10:00");
const TOKEN = first.dashboardToken;
log(first.ok, `initial booking -> dashboard token ${TOKEN.slice(0,8)}…`);
await clearHolds();

// The reported scenario: books again, types their name differently.
const b2 = await book("ramesh  PATIL jr", PHONE, "11:00", TOKEN);
log(b2.ok && b2.dashboardToken === TOKEN, `different name spelling + token -> SAME dashboard link`);
await clearHolds();

// Even a different phone still lands on the record whose link they hold.
const b3 = await book("Ramesh Patil", ALT, "12:00", TOKEN);
log(b3.ok && b3.dashboardToken === TOKEN, `different phone number + token -> SAME dashboard link`);
await clearHolds();

// Without the token (typed straight into the main site) the old fork returns.
const b4 = await book("R. Patil", PHONE, "13:00", null);
log(b4.ok && b4.dashboardToken !== TOKEN, `no token + new name -> separate record (expected)`);
await clearHolds();

// Booking for someone else from the dashboard must NOT reuse the record.
const b5 = await book("Sunita Patil", PHONE, "14:00", null);
log(b5.ok && b5.dashboardToken !== TOKEN, `"someone else" (token withheld) -> their own record`);

const [me] = await db.select().from(patients).where(eq(patients.dashboardToken, TOKEN));
const mine = await db.select().from(appointments).where(eq(appointments.patientId, me.id));
log(mine.length === 3, `my dashboard shows all 3 of MY bookings (got ${mine.length})`);

const rows = await db.select().from(patients).where(inArray(patients.phone, [PHONE, ALT]));
for (const ph of [PHONE, ALT]) await db.delete(appointments).where(eq(appointments.patientPhone, ph));
await db.delete(patients).where(inArray(patients.id, rows.map(r => r.id)));
await db.delete(availabilityRules).where(eq(availabilityRules.id, rule.id));
console.log(pass ? "\nALL PASSED" : "\nFAILURES ABOVE");
process.exit(pass ? 0 : 1);
