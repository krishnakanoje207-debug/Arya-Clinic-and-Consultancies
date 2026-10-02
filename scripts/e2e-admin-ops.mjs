/**
 * DB-level admin-ops E2E — drives the REAL library functions (not
 * re-implementations) against the live local database:
 *   filled_slots → slot grid marks it taken → direct booking rejected as
 *   slot_taken → toggle off frees it (booking succeeds) → markAppointmentCompleted
 *   transition sets completed_at → queue buckets classify remaining/delayed/
 *   completed → sheets/gcal no-op without env → CSV column assembly → cleanup.
 *
 *   node --env-file=.env scripts/e2e-admin-ops.mjs
 *
 * Imports app modules through the "@/" alias via scripts/alias-loader.mjs
 * (same pattern as e2e-medications.mjs), so the exact functions the UI calls
 * are under test. Requires GOOGLE_* env vars to be UNSET (they no-op).
 */
import { register } from "node:module";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

register("./scripts/alias-loader.mjs", pathToFileURL("./").href);

const { DateTime } = await import("luxon");
const { eq, inArray } = await import("drizzle-orm");
const { db } = await import("@/db");
const { appointments, availabilityRules, filledSlots, patients, services } =
  await import("@/db/schema");
const { istToday, istWallToUtc } = await import("@/lib/time");
const {
  createBooking,
  getAdminDaySlots,
  overlapsFilledSlot,
} = await import("@/lib/booking");
const { getQueueBuckets, completeAppointmentRow, shiftTodaysAppointments } =
  await import("@/lib/admin");
const { dispatchFollowUpNudge } = await import("@/lib/notify");
const { getSettings, setSetting } = await import("@/lib/settings");
const {
  appendCompletedAppointmentRow,
  sheetsConfigured,
  buildCompletedRow,
  assembleCompletedRow,
  COMPLETED_HEADERS,
} = await import("@/lib/sheets");
const { createAppointmentEvent, calendarConfigured } = await import("@/lib/gcal");
const { parseConsultationRecord, latestNextAppointment, nextAppointmentsByPatient } =
  await import("@/lib/consultations");

const NORM = "9999000003"; // test-only phone (last 10 digits); rows deleted below
const DATE = "2030-03-04"; // far-future IST date, never collides with real data
// That date is past the booking horizon, so lift it for this run.
const { booking_horizon_days: PREV_HORIZON } = await getSettings(["booking_horizon_days"]);
await setSetting("booking_horizon_days", 2000);

function log(ok, msg) {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) process.exitCode = 1;
}

let ruleId = null;
let patientId = null;
try {
  const [svc] = await db.select().from(services);
  log(!!svc, `picked service #${svc?.id} (${svc?.durationMinutes}m)`);
  const len = svc.durationMinutes;

  // A test patient (mirrors upsertPatientForBooking's insert).
  const [pat] = await db
    .insert(patients)
    .values({ name: "E2E Admin", nameKey: "e2e admin", phone: NORM })
    .onConflictDoUpdate({
      target: [patients.phone, patients.nameKey],
      set: { name: "E2E Admin" },
    })
    .returning();
  patientId = pat.id;

  const start = istWallToUtc(DATE, "10:00");
  const end = new Date(start.getTime() + len * 60000);

  // --- Task 1: filled slot marks taken + blocks booking ---
  await db.insert(filledSlots).values({ startAt: start, endAt: end });
  log(await overlapsFilledSlot(start, end), "filled_slots row detected by overlapsFilledSlot");

  const weekday = DateTime.fromISO(DATE, { zone: "Asia/Kolkata" }).weekday % 7;
  const [rule] = await db
    .insert(availabilityRules)
    .values({
      weekday,
      startTime: "10:00",
      endTime: "11:00",
      slotLengthMinutes: 30,
      mode: "online",
      active: true,
    })
    .returning();
  ruleId = rule.id;

  const grid = await getAdminDaySlots({ serviceId: svc.id, mode: "online", dateStr: DATE });
  const marked = grid.slots.find((s) => s.startAt === start.toISOString());
  log(marked?.filled === true && marked?.booked === false, "admin day grid marks the slot filled (not booked)");

  const blocked = await createBooking({
    serviceId: svc.id,
    mode: "online",
    startAtIso: start.toISOString(),
    patient: { name: "E2E Admin", phone: NORM },
  });
  log(blocked.ok === false && blocked.reason === "slot_taken", "createBooking on a filled slot rejected as slot_taken");

  // --- toggle off (delete the filled row) frees the slot ---
  await db.delete(filledSlots).where(eq(filledSlots.startAt, start));
  log(!(await overlapsFilledSlot(start, end)), "after removing filled row, slot no longer taken");
  const freed = await createBooking({
    serviceId: svc.id,
    mode: "online",
    startAtIso: start.toISOString(),
    patient: { name: "E2E Admin", phone: NORM },
  });
  log(freed.ok === true, "createBooking succeeds once the filled mark is removed");
  if (freed.ok) {
    await db.delete(appointments).where(eq(appointments.id, freed.appointment.id));
  }

  // --- Task 2: markAppointmentCompleted transition + bucket classification ---
  const future = istWallToUtc(DATE, "12:00");
  const past = istWallToUtc("2020-01-01", "10:00"); // confirmed but long past → delayed
  const mkAppt = async (startAt) => {
    const [row] = await db
      .insert(appointments)
      .values({
        patientName: "E2E Admin",
        patientPhone: NORM,
        patientId,
        serviceId: svc.id,
        mode: "online",
        startAt,
        endAt: new Date(startAt.getTime() + len * 60000),
        status: "confirmed",
        amountInr: svc.feeInr,
        manageToken: randomUUID(),
      })
      .returning();
    return row;
  };
  const remainingAppt = await mkAppt(future);
  const delayedAppt = await mkAppt(past);
  const toComplete = await mkAppt(istWallToUtc(DATE, "12:30"));

  // The consultation record entered under "Start consultation".
  log(parseConsultationRecord({ nextAppointmentOn: "2030-02-31" }) === null, "parseConsultationRecord rejects an impossible date");
  log(parseConsultationRecord({ nextAppointmentOn: "12/04/2030" }) === null, "parseConsultationRecord rejects a non-ISO date");
  const blank = parseConsultationRecord({ reportedSymptoms: "  ", medicinesPrescribed: "", nextAppointmentOn: "" });
  log(blank && blank.reportedSymptoms === null && blank.medicinesPrescribed === null && blank.nextAppointmentOn === null, "blank record fields become null (nothing is required)");
  log(await latestNextAppointment(patientId) === null, "no next appointment before any completed consult");

  const record = parseConsultationRecord({
    reportedSymptoms: "Wheezing at night",
    medicinesPrescribed: "Ars alb 30",
    nextAppointmentOn: "2030-04-15",
  });
  const completed = await completeAppointmentRow(toComplete.id, record);
  log(completed?.status === "completed" && completed?.completedAt != null, "completeAppointmentRow → completed + completed_at set");
  log(completed?.reportedSymptoms === "Wheezing at night" && completed?.medicinesPrescribed === "Ars alb 30" && completed?.nextAppointmentOn === "2030-04-15", "consultation record saved in the same update");
  log(await completeAppointmentRow(toComplete.id, record) === undefined, "completing twice is refused (row no longer confirmed)");
  log(await latestNextAppointment(patientId) === "2030-04-15", "latestNextAppointment returns the recorded date");
  log((await nextAppointmentsByPatient()).get(patientId) === "2030-04-15", "nextAppointmentsByPatient maps the patient to the date");

  const buckets = await getQueueBuckets();
  const inBucket = (b, id) => b.some((r) => r.appt.id === id);
  log(inBucket(buckets.remaining, remainingAppt.id), "remaining bucket contains the future confirmed appt");
  log(inBucket(buckets.delayed, delayedAppt.id), "delayed bucket contains the past confirmed appt");
  log(inBucket(buckets.completed, toComplete.id), "completed bucket contains the just-completed appt");
  log(!inBucket(buckets.remaining, delayedAppt.id) && !inBucket(buckets.delayed, remainingAppt.id), "remaining/delayed do not cross-classify");

  // --- Task 3/4: Google libs no-op without env, CSV columns assemble ---
  // Force the unset state deterministically (local .env may have real creds).
  const saved = {
    GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
    GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
  };
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  delete process.env.GOOGLE_SHEET_ID;
  delete process.env.GOOGLE_CALENDAR_ID;
  try {
    log(sheetsConfigured() === false, "sheetsConfigured() false when GOOGLE_SHEET_ID unset");
    const sheetRes = await appendCompletedAppointmentRow(toComplete.id);
    log(sheetRes.ok === false && sheetRes.skipped === true, "appendCompletedAppointmentRow no-ops without throwing");
    log(calendarConfigured() === false, "calendarConfigured() false when GOOGLE_CALENDAR_ID unset");
    const calRes = await createAppointmentEvent(remainingAppt);
    log(calRes.ok === false && calRes.skipped === true, "createAppointmentEvent no-ops without throwing");
  } finally {
    Object.assign(process.env, saved);
  }

  const row = buildCompletedRow({ patientName: "X", amountInr: 500, completedVisits: 2 });
  log(row.length === COMPLETED_HEADERS.length, `buildCompletedRow width matches headers (${row.length}/${COMPLETED_HEADERS.length})`);
  const assembled = await assembleCompletedRow(completed, "Test Service");
  log(assembled.length === COMPLETED_HEADERS.length, "assembleCompletedRow width matches headers");
  const col = (h) => assembled[COMPLETED_HEADERS.indexOf(h)];
  log(col("Reported symptoms") === "Wheezing at night" && col("Medicines prescribed") === "Ars alb 30" && col("Next appointment") === "15 Apr 2030", "sheet row carries the consultation record");

  // --- Feature A: shiftTodaysAppointments (Running late) ---
  // Three confirmed appointments today at consecutive IST slots.
  const today = istToday();
  const base = istWallToUtc(today, "01:00"); // quiet hour, unlikely to collide
  const seeded = [];
  for (let i = 0; i < 3; i++) {
    const s = new Date(base.getTime() + i * len * 60000);
    seeded.push(await mkAppt(s));
  }
  const originalStart = new Map(seeded.map((r) => [r.id, new Date(r.startAt).getTime()]));
  const originalEnd = new Map(seeded.map((r) => [r.id, new Date(r.endAt).getTime()]));

  const shifted = await shiftTodaysAppointments(15);
  const shiftedIds = new Set(shifted.map((r) => r.id));
  log(
    seeded.every((r) => shiftedIds.has(r.id)),
    "shiftTodaysAppointments returned all 3 seeded rows",
  );

  const afterRows = await db
    .select()
    .from(appointments)
    .where(inArray(appointments.id, seeded.map((r) => r.id)));
  const allMoved = afterRows.every(
    (r) =>
      new Date(r.startAt).getTime() === originalStart.get(r.id) + 15 * 60000 &&
      new Date(r.endAt).getTime() === originalEnd.get(r.id) + 15 * 60000,
  );
  log(allMoved, "all 3 shifted exactly +15 min (start_at and end_at) — no constraint error");

  const orderedBefore = seeded.map((r) => r.id);
  const orderedAfter = [...afterRows]
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
    .map((r) => r.id);
  log(
    JSON.stringify(orderedBefore) === JSON.stringify(orderedAfter),
    "relative order preserved after shift",
  );

  let rejected = false;
  try {
    await shiftTodaysAppointments(20);
  } catch {
    rejected = true;
  }
  log(rejected, "shiftTodaysAppointments(20) rejected (invalid interval)");

  // --- Feature B: dispatchFollowUpNudge no-ops without notification env ---
  const savedNotify = {
    GMAIL_USER: process.env.GMAIL_USER,
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
    TEXTBEE_API_KEY: process.env.TEXTBEE_API_KEY,
    TEXTBEE_DEVICE_ID: process.env.TEXTBEE_DEVICE_ID,
  };
  delete process.env.GMAIL_USER;
  delete process.env.GMAIL_APP_PASSWORD;
  delete process.env.TEXTBEE_API_KEY;
  delete process.env.TEXTBEE_DEVICE_ID;
  try {
    const channels = await dispatchFollowUpNudge({
      name: "E2E Admin",
      phone: NORM,
      email: "e2e@example.com",
      dashboardToken: "e2e-token",
    });
    log(
      channels.email === false && channels.sms === false,
      "dispatchFollowUpNudge returns all-false without throwing when notify env blank",
    );
  } finally {
    Object.assign(process.env, savedNotify);
  }
} finally {
  await db.delete(appointments).where(eq(appointments.patientPhone, NORM));
  await db.delete(filledSlots).where(eq(filledSlots.startAt, istWallToUtc(DATE, "10:00")));
  if (ruleId != null) await db.delete(availabilityRules).where(eq(availabilityRules.id, ruleId));
  if (patientId != null) await db.delete(patients).where(eq(patients.id, patientId));
  await setSetting("booking_horizon_days", PREV_HORIZON);
  console.log("\ncleanup: removed test appointment/filled_slot/availability rule/patient rows");
}
process.exit(process.exitCode || 0);
