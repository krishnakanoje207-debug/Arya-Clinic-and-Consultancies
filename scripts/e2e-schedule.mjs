/**
 * Weekly schedule rules: recurring breaks, the buffer between consultations,
 * the booking horizon, and "available only these hours" date overrides —
 * checked both in the offered calendar AND on the server, since createBooking
 * is reachable without ever rendering the grid. Also checks the admin
 * filled-slots grid derives the same hours.
 *
 *   node --env-file=.env scripts/e2e-schedule.mjs
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";
register("./scripts/alias-loader.mjs", pathToFileURL("./").href);

const { and, eq, inArray } = await import("drizzle-orm");
const { db } = await import("@/db");
const { appointments, availabilityRules, patients, services, slotOverrides } = await import("@/db/schema");
const { createBooking, getAdminDaySlots, getServiceCalendar } = await import("@/lib/booking");
const { istToday, istWallToUtc, istWeekday } = await import("@/lib/time");
const { getSettings, setSetting } = await import("@/lib/settings");
const { DateTime } = await import("luxon");

let pass = true;
const log = (ok, m) => { if (!ok) pass = false; console.log(`${ok ? "✓" : "✗"} ${m}`); };

const PHONE = "9000099999";
const day = DateTime.fromISO(istToday(), { zone: "Asia/Kolkata" }).plus({ days: 4 });
const DATE = day.toISODate();
const WD = istWeekday(DATE);

const [svc] = await db.select().from(services).where(eq(services.active, true));
const SLOT = svc.durationMinutes;

const prev = await getSettings(["booking_horizon_days", "slot_buffer_minutes"]);
await setSetting("booking_horizon_days", 14);
await setSetting("slot_buffer_minutes", 10);
const BUF = 10;

// Isolate: park any real rules for this weekday+mode, add our own.
const existing = await db.select().from(availabilityRules)
  .where(and(eq(availabilityRules.weekday, WD), eq(availabilityRules.mode, "online")));
if (existing.length) {
  await db.update(availabilityRules).set({ active: false })
    .where(inArray(availabilityRules.id, existing.map((r) => r.id)));
}
const mkRule = (kind, a, b) => db.insert(availabilityRules).values({
  weekday: WD, startTime: a, endTime: b, slotLengthMinutes: SLOT,
  mode: "online", kind, active: true,
}).returning();
const [open] = await mkRule("open", "10:00", "16:00");
const [brk] = await mkRule("break", "12:00", "13:00");

let onlyRows = [];

const mins = (iso) => {
  const d = DateTime.fromISO(iso, { zone: "Asia/Kolkata" });
  return d.hour * 60 + d.minute;
};

try {
  const cal = await getServiceCalendar(svc.id, { mode: "online" });
  const today = cal.days.find((d) => d.date === DATE);
  const starts = today.slots.map((s) => mins(s.startAt)).sort((a, b) => a - b);

  log(starts.length > 0, `generated ${starts.length} slot(s) on ${DATE}`);

  const gaps = starts.slice(1).map((v, i) => v - starts[i]);
  const acrossBreak = gaps.filter((g) => g > SLOT + BUF).length;
  log(
    gaps.every((g) => g === SLOT + BUF || g > SLOT + BUF),
    `slots spaced by at least ${SLOT}+${BUF} min (gaps: ${[...new Set(gaps)].join(", ")})`,
  );
  log(acrossBreak === 1, `exactly one larger gap, where the lunch break sits`);

  const inBreak = starts.filter((m) => m + SLOT > 12 * 60 && m < 13 * 60);
  log(inBreak.length === 0, `no slot overlaps the 12:00–13:00 break`);

  log(cal.days.length === 14, `horizon offers 14 days (got ${cal.days.length})`);

  // --- server-side: the grid is not the only gate ---
  const mk = (at) => createBooking({
    serviceId: svc.id, mode: "online",
    startAtIso: istWallToUtc(DATE, at).toISOString(),
    patient: { name: "Schedule E2E", phone: PHONE, email: "", note: "n" },
  });

  const inLunch = await mk("12:00");
  log(!inLunch.ok && inLunch.reason === "slot_taken", `booking inside the break rejected (${inLunch.reason})`);

  const offGrid = await mk("10:20");
  log(!offGrid.ok, `booking off the slot grid rejected (${offGrid.reason})`);

  const beyond = await createBooking({
    serviceId: svc.id, mode: "online",
    startAtIso: istWallToUtc(day.plus({ days: 60 }).toISODate(), "10:00").toISOString(),
    patient: { name: "Schedule E2E", phone: PHONE, email: "", note: "n" },
  });
  log(!beyond.ok, `booking beyond the horizon rejected (${beyond.reason})`);

  const good = await mk("10:00");
  log(good.ok, `a slot on the grid books fine`);

  if (good.ok) {
    const after = await getServiceCalendar(svc.id, { mode: "online" });
    const d2 = after.days.find((d) => d.date === DATE);
    // Exactly one buffer after the booking ends is the FIRST legitimate slot,
    // so it must stay bookable — the buffer is breathing room, not a blackout.
    const neighbour = d2.slots.find((s) => mins(s.startAt) === 10 * 60 + SLOT + BUF);
    log(neighbour && neighbour.available, `the slot exactly one buffer later is still bookable`);
    const booked = d2.slots.find((s) => mins(s.startAt) === 10 * 60);
    log(booked && !booked.available, `the booked slot itself shows as taken`);
    const tooClose = d2.slots.find((s) => {
      const m = mins(s.startAt);
      return m > 10 * 60 && m < 10 * 60 + SLOT + BUF;
    });
    log(!tooClose, `nothing is offered inside the buffer window itself`);
  }

  // --- admin "mark slots as booked" grid must agree about the break ---
  const adminDay = await getAdminDaySlots({ serviceId: svc.id, mode: "online", dateStr: DATE });
  const adminInBreak = adminDay.slots.filter((s) => {
    const m = mins(s.startAt);
    return m + SLOT > 12 * 60 && m < 13 * 60;
  });
  log(adminDay.slots.length > 0 && adminInBreak.length === 0,
    `admin grid offers no slot inside the break (${adminDay.slots.length} slots)`);
  const publicStarts = new Set(today.slots.map((s) => s.startAt));
  log(
    adminDay.slots.length === today.slots.length &&
      adminDay.slots.every((s) => publicStarts.has(s.startAt)),
    `admin grid offers exactly the public slot times, buffer included`,
  );
  const adminNeighbour = adminDay.slots.find((s) => mins(s.startAt) === 10 * 60 + SLOT + BUF);
  const adminBooked = adminDay.slots.find((s) => mins(s.startAt) === 10 * 60);
  log(adminBooked?.booked && adminNeighbour && !adminNeighbour.booked,
    `admin grid: the booked slot shows booked, the next one (one buffer later) stays markable`);

  // --- "available only these hours" replaces the weekly hours for one date ---
  // Same weekday a week later, so the 10:00–16:00 rule and 12–13 break apply.
  const onlyDate = day.plus({ days: 7 }).toISODate();
  onlyRows = await db.insert(slotOverrides).values([
    { onDate: onlyDate, kind: "only", startTime: "11:00", endTime: "13:30" },
    { onDate: onlyDate, kind: "only", startTime: "14:00", endTime: "16:00" },
  ]).returning();
  const cal3 = await getServiceCalendar(svc.id, { mode: "online" });
  const d3 = cal3.days.find((d) => d.date === onlyDate);
  const s3 = d3.slots.map((s) => [mins(s.startAt), mins(s.endAt)]);
  const inside = ([a, b]) => (a >= 11 * 60 && b <= 13 * 60 + 30) || (a >= 14 * 60 && b <= 16 * 60);
  log(s3.length > 0 && s3.every(inside),
    `only-these-hours day offers slots only inside 11:00–13:30 and 14:00–16:00 (${s3.map(([a]) => `${Math.floor(a / 60)}:${String(a % 60).padStart(2, "0")}`).join(", ")})`);
  log(!s3.some(([a]) => a === 10 * 60), `the weekly 10:00 opening is not offered that day`);
  log(!s3.some(([a, b]) => b > 12 * 60 && a < 13 * 60), `the recurring break still applies inside an only-these-hours window`);
  log(s3.some(([a]) => a === 14 * 60), `the second window opens on time at 14:00`);

  const adminOnly = await getAdminDaySlots({ serviceId: svc.id, mode: "online", dateStr: onlyDate });
  log(adminOnly.slots.length > 0 && adminOnly.slots.every((s) => inside([mins(s.startAt), mins(s.endAt)])),
    `admin grid shows the same only-these-hours windows`);

  const mkOn = (at) => createBooking({
    serviceId: svc.id, mode: "online",
    startAtIso: istWallToUtc(onlyDate, at).toISOString(),
    patient: { name: "Schedule E2E", phone: PHONE, email: "", note: "n" },
  });
  const outside = await mkOn("10:00");
  log(!outside.ok, `booking at the weekly 10:00 on that day is rejected (${outside.reason})`);
  const insideBooking = await mkOn("14:00");
  log(insideBooking.ok, `booking inside the only-these-hours window works`);
} finally {
  if (onlyRows.length) {
    await db.delete(slotOverrides).where(inArray(slotOverrides.id, onlyRows.map((r) => r.id)));
  }
  await db.delete(appointments).where(eq(appointments.patientPhone, PHONE));
  await db.delete(patients).where(eq(patients.phone, PHONE));
  await db.delete(availabilityRules).where(inArray(availabilityRules.id, [open.id, brk.id]));
  if (existing.length) {
    await db.update(availabilityRules).set({ active: true })
      .where(inArray(availabilityRules.id, existing.filter((r) => r.active).map((r) => r.id)));
  }
  await setSetting("booking_horizon_days", prev.booking_horizon_days);
  await setSetting("slot_buffer_minutes", prev.slot_buffer_minutes);
  console.log("\ncleanup: rules, bookings and settings restored");
}

process.exitCode = pass ? 0 : 1;
