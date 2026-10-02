import { randomUUID } from "crypto";
import { and, eq, gt, gte, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  availabilityRules,
  filledSlots,
  patients,
  services,
  slotOverrides,
} from "@/db/schema";
import { IST_ZONE, addMinutes, istToday, istWeekday, nowUtc } from "@/lib/time";
import { upsertPatientForBooking } from "@/lib/patients";
import { getSettings } from "@/lib/settings";
import { DateTime } from "luxon";

const HOLD_MINUTES = 15;
const DEFAULT_HORIZON_DAYS = 30;

/** 'HH:mm[:ss]' → minutes since midnight. */
function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** An IST calendar date + minutes-since-midnight → UTC JS Date. */
function istMinutesToUtc(dateStr, minutes) {
  return DateTime.fromISO(dateStr, { zone: IST_ZONE })
    .plus({ minutes })
    .toUTC()
    .toJSDate();
}

/** Subtract blocked [start,end) ranges from a base [start,end) window,
 * returning the surviving sub-windows (all in minutes-since-midnight). */
function subtractRanges(windowStart, windowEnd, blocked) {
  let pieces = [[windowStart, windowEnd]];
  for (const [bs, be] of blocked) {
    const next = [];
    for (const [ps, pe] of pieces) {
      if (be <= ps || bs >= pe) {
        next.push([ps, pe]); // no overlap
        continue;
      }
      if (bs > ps) next.push([ps, Math.min(bs, pe)]);
      if (be < pe) next.push([Math.max(be, ps), pe]);
    }
    pieces = next;
  }
  return pieces.filter(([s, e]) => e > s);
}

/**
 * The bookable [start,end) windows (IST minutes) for one date, before any
 * bookings are considered. Base hours are the weekday's open rules — or, when
 * the date carries "only" overrides ("available only these hours"), just
 * those, replacing the weekly hours for that day. "extra" overrides add to the
 * base; partial "blocked" overrides and recurring weekly breaks are carved out
 * of it. A whole-day block closes the day outright.
 *
 * Shared by the public calendar and the admin filled-slots grid so the two can
 * never disagree about which hours exist (they had: the admin grid used break
 * rules as open hours).
 */
function dayWindows(wd, rules, dayOverrides) {
  if (dayOverrides.some((o) => o.kind === "blocked" && !o.startTime)) return [];
  const range = (x) => [timeToMinutes(x.startTime), timeToMinutes(x.endTime)];
  const timed = (kind) =>
    dayOverrides.filter((o) => o.kind === kind && o.startTime && o.endTime);

  const only = timed("only");
  const base = only.length
    ? only.map(range)
    : rules.filter((r) => r.kind !== "break" && r.weekday === wd).map(range);
  const windows = [...base, ...timed("extra").map(range)];
  const carved = [
    ...timed("blocked").map(range),
    ...rules.filter((r) => r.kind === "break" && r.weekday === wd).map(range),
  ];
  return windows.flatMap(([ws, we]) => subtractRanges(ws, we, carved));
}

/**
 * Lazily expire stale holds: any pending_payment row whose 15-minute hold
 * has lapsed becomes 'expired', so it stops blocking the exclusion
 * constraint and disappears from availability. Runs opportunistically on
 * every availability read and every booking attempt — no scheduler needed
 * (Vercel Hobby cron is once-daily only).
 */
export async function expireStaleHolds(conn = db) {
  await conn
    .update(appointments)
    .set({ status: "expired", updatedAt: nowUtc() })
    .where(
      and(
        eq(appointments.status, "pending_payment"),
        lte(appointments.holdExpiresAt, nowUtc()),
      ),
    );
}

/** All currently blocking appointment time-ranges (active = confirmed, or
 * pending_payment with an unexpired hold). Blocks across BOTH modes. */
async function loadActiveRanges(fromUtc, toUtc) {
  const now = nowUtc();
  const rows = await db
    .select({
      startAt: appointments.startAt,
      endAt: appointments.endAt,
    })
    .from(appointments)
    .where(
      and(
        gte(appointments.startAt, fromUtc),
        lte(appointments.startAt, toUtc),
        or(
          eq(appointments.status, "confirmed"),
          and(
            eq(appointments.status, "pending_payment"),
            gte(appointments.holdExpiresAt, now),
          ),
        ),
      ),
    );
  return rows.map((r) => [
    new Date(r.startAt).getTime(),
    new Date(r.endAt).getTime(),
  ]);
}

/** Admin-marked "display as booked" ranges overlapping [fromUtc, toUtc]. These
 * make a slot show as taken (deliberate scarcity) without a real booking. */
async function loadFilledRanges(fromUtc, toUtc) {
  const rows = await db
    .select({ startAt: filledSlots.startAt, endAt: filledSlots.endAt })
    .from(filledSlots)
    .where(and(gte(filledSlots.startAt, fromUtc), lte(filledSlots.startAt, toUtc)));
  return rows.map((r) => [
    new Date(r.startAt).getTime(),
    new Date(r.endAt).getTime(),
  ]);
}

/** True when [startAt, endAt) overlaps any admin-marked filled_slots row. Used
 * server-side so a crafted POST can't book a slot the doctor marked as booked.
 * Half-open overlap: filled.start < endAt AND filled.end > startAt. */
export async function overlapsFilledSlot(startAt, endAt) {
  const [row] = await db
    .select({ id: filledSlots.id })
    .from(filledSlots)
    .where(and(lt(filledSlots.startAt, endAt), gt(filledSlots.endAt, startAt)))
    .limit(1);
  return Boolean(row);
}

/**
 * Build the calendar for a service: for each of the next `days` IST days,
 * derive bookable slots from availability_rules minus slot_overrides. Booked
 * (real or admin-marked filled), held and past slots are returned with
 * available:false; taken:true additionally flags real/filled bookings so the
 * UI can render them as greyed "Booked" chips (past slots stay unavailable but
 * not "Booked").
 */
export async function getServiceCalendar(serviceId, { mode, days } = {}) {
  await expireStaleHolds();

  // How far ahead to offer, and how much breathing room to leave after each
  // consultation. Both are admin-editable; fall back to the defaults if the
  // settings row is unreadable so the calendar never comes back empty.
  const { booking_horizon_days: horizon, slot_buffer_minutes: bufferSetting } =
    await getSettings(["booking_horizon_days", "slot_buffer_minutes"]);
  const horizonDays = days ?? Number(horizon) ?? DEFAULT_HORIZON_DAYS;
  const buffer = Math.max(0, Number(bufferSetting) || 0);

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.active, true)));
  if (!service) return { service: null, days: [] };

  const targetMode =
    mode || (service.mode === "clinic" ? "clinic" : "online");
  const slotLen = service.durationMinutes;

  const today = istToday();
  const start = DateTime.fromISO(today, { zone: IST_ZONE });
  const dateStrs = Array.from({ length: horizonDays }, (_, i) =>
    start.plus({ days: i }).toFormat("yyyy-MM-dd"),
  );

  const rules = await db
    .select()
    .from(availabilityRules)
    .where(
      and(
        eq(availabilityRules.active, true),
        eq(availabilityRules.mode, targetMode),
      ),
    );

  const overrides = await db
    .select()
    .from(slotOverrides)
    .where(
      and(
        gte(slotOverrides.onDate, dateStrs[0]),
        lte(slotOverrides.onDate, dateStrs[dateStrs.length - 1]),
        or(
          eq(slotOverrides.mode, targetMode),
          sql`${slotOverrides.mode} is null`,
        ),
      ),
    );

  const fromUtc = istMinutesToUtc(dateStrs[0], 0);
  const toUtc = istMinutesToUtc(dateStrs[dateStrs.length - 1], 24 * 60);
  const [activeRanges, filledRanges] = await Promise.all([
    loadActiveRanges(fromUtc, toUtc),
    loadFilledRanges(fromUtc, toUtc),
  ]);
  const takenRanges = [...activeRanges, ...filledRanges];
  const now = nowUtc().getTime();

  const out = [];
  for (const dateStr of dateStrs) {
    const wd = istWeekday(dateStr);
    const dayOverrides = overrides.filter((o) => o.onDate === dateStr);

    const slots = [];
    for (const [ps, pe] of dayWindows(wd, rules, dayOverrides)) {
      // Step by the consultation length PLUS the buffer, so consecutive
      // offers are never back to back.
      for (let s = ps; s + slotLen <= pe; s += slotLen + buffer) {
        const startUtc = istMinutesToUtc(dateStr, s);
        const endUtc = istMinutesToUtc(dateStr, s + slotLen);
        const sMs = startUtc.getTime();
        const eMs = endUtc.getTime();
        const isPast = sMs <= now;
        // Taken ranges are widened by the buffer on both sides. Stepping
        // alone only spaces slots within one service's grid; a service of a
        // different duration would otherwise still offer a slot butting up
        // against an existing appointment.
        const pad = buffer * 60000;
        const isTaken = takenRanges.some(
          ([as, ae]) => sMs < ae + pad && as - pad < eMs,
        );
        slots.push({
          startAt: startUtc.toISOString(),
          endAt: endUtc.toISOString(),
          label:
            DateTime.fromJSDate(startUtc)
              .setZone(IST_ZONE)
              .toFormat("hh:mm a") +
            " – " +
            DateTime.fromJSDate(endUtc)
              .setZone(IST_ZONE)
              .toFormat("hh:mm a"),
          available: !isPast && !isTaken,
          taken: isTaken,
        });
      }
    }
    slots.sort((a, b) => a.startAt.localeCompare(b.startAt));
    out.push({ date: dateStr, weekday: wd, slots });
  }

  return { service, mode: targetMode, days: out };
}

/**
 * Generate one IST day's slot grid for the admin "Filled slots" manager. Same
 * derivation as getServiceCalendar for a single date — same windows, same
 * duration + buffer stepping, so the doctor marks exactly the times patients
 * see — but each slot carries its state: booked (a real active appointment
 * overlaps it, buffer included, exactly as the public grid decides "Booked" —
 * not toggleable) or filled (overlaps an admin-marked filled_slots row —
 * toggleable off; exact overlap, since that is what unmarking deletes). Past
 * and whole-day-blocked handling mirrors the public calendar.
 */
export async function getAdminDaySlots({ serviceId, mode, dateStr }) {
  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, Number(serviceId)), eq(services.active, true)));
  if (!service) return { service: null, slots: [] };

  const targetMode = mode || (service.mode === "clinic" ? "clinic" : "online");
  const slotLen = service.durationMinutes;
  const wd = istWeekday(dateStr);
  const { slot_buffer_minutes: bufferSetting } = await getSettings([
    "slot_buffer_minutes",
  ]);
  const buffer = Math.max(0, Number(bufferSetting) || 0);
  const pad = buffer * 60000;

  const rules = await db
    .select()
    .from(availabilityRules)
    .where(
      and(
        eq(availabilityRules.active, true),
        eq(availabilityRules.mode, targetMode),
      ),
    );
  const dayOverrides = await db
    .select()
    .from(slotOverrides)
    .where(
      and(
        eq(slotOverrides.onDate, dateStr),
        or(eq(slotOverrides.mode, targetMode), sql`${slotOverrides.mode} is null`),
      ),
    );

  const windows = dayWindows(wd, rules, dayOverrides);
  if (!windows.length) return { service, mode: targetMode, slots: [] };

  const fromUtc = istMinutesToUtc(dateStr, 0);
  const toUtc = istMinutesToUtc(dateStr, 24 * 60);
  const [activeRanges, filledRanges] = await Promise.all([
    loadActiveRanges(fromUtc, toUtc),
    loadFilledRanges(fromUtc, toUtc),
  ]);
  const now = nowUtc().getTime();

  const slots = [];
  for (const [ps, pe] of windows) {
    for (let s = ps; s + slotLen <= pe; s += slotLen + buffer) {
      const startUtc = istMinutesToUtc(dateStr, s);
      const endUtc = istMinutesToUtc(dateStr, s + slotLen);
      const sMs = startUtc.getTime();
      const eMs = endUtc.getTime();
      const overlaps = (r, p = 0) => r.some(([as, ae]) => sMs < ae + p && as - p < eMs);
      slots.push({
        startAt: startUtc.toISOString(),
        endAt: endUtc.toISOString(),
        label:
          DateTime.fromJSDate(startUtc).setZone(IST_ZONE).toFormat("hh:mm a") +
          " – " +
          DateTime.fromJSDate(endUtc).setZone(IST_ZONE).toFormat("hh:mm a"),
        past: sMs <= now,
        booked: overlaps(activeRanges, pad),
        filled: overlaps(filledRanges),
      });
    }
  }
  slots.sort((a, b) => a.startAt.localeCompare(b.startAt));
  return { service, mode: targetMode, slots };
}

/**
 * Create a booking race-safely. The Postgres EXCLUSION constraint is the
 * real guard: even two simultaneous requests for the same slot cannot both
 * insert — the loser gets a 23P01 and we report the slot as taken. We
 * expire stale holds first so a lapsed hold never falsely blocks.
 *
 * Returns { ok, appointment? , reason? }.
 */
export async function createBooking({
  serviceId,
  mode,
  startAtIso,
  patient,
  patientToken = null,
}) {
  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.active, true)));
  if (!service) return { ok: false, reason: "service_unavailable" };

  const bookingMode =
    mode || (service.mode === "clinic" ? "clinic" : "online");
  if (service.mode !== "both" && service.mode !== bookingMode) {
    return { ok: false, reason: "mode_mismatch" };
  }

  const startAt = new Date(startAtIso);
  if (Number.isNaN(startAt.getTime())) {
    return { ok: false, reason: "bad_time" };
  }
  if (startAt.getTime() <= nowUtc().getTime()) {
    return { ok: false, reason: "in_past" };
  }
  const endAt = addMinutes(startAt, service.durationMinutes);

  // The requested time must be a slot we actually offered. The weekly hours,
  // the recurring lunch break, the booking horizon and the buffer between
  // consultations exist ONLY in the calendar, so without this check a crafted
  // request could book straight through any of them.
  if (!(await isOfferedSlot(service.id, bookingMode, startAt))) {
    return { ok: false, reason: "slot_taken" };
  }

  // A slot the doctor marked as booked (deliberate scarcity) can't be booked,
  // even by a crafted POST that never rendered it as "Booked".
  if (await overlapsFilledSlot(startAt, endAt)) {
    return { ok: false, reason: "slot_taken" };
  }

  const holdExpiresAt = addMinutes(nowUtc(), HOLD_MINUTES);
  const manageToken = randomUUID();

  await expireStaleHolds();

  // Anti-hoarding: one phone number may hold at most 2 unpaid slots at a
  // time. DB-level check (rate limiting in proxy.js is only per-instance
  // burst protection on serverless).
  const [{ held }] = await db
    .select({ held: sql`count(*)::int` })
    .from(appointments)
    .where(
      and(
        eq(appointments.patientPhone, patient.phone),
        eq(appointments.status, "pending_payment"),
        gte(appointments.holdExpiresAt, nowUtc()),
      ),
    );
  if (held >= 2) return { ok: false, reason: "too_many_holds" };

  // A booking made from the patient's own dashboard link is bound to THAT
  // patient row rather than re-derived from what was typed. Re-deriving it
  // was how a returning patient could pay for a follow-up and never see it:
  // any variation in the name or number they entered produced a different
  // patient record with a different dashboard token, so the magic link they
  // already had never showed the appointment — and they booked again.
  // The token is only sent when the patient said the consult is for
  // themselves, so booking for a relative still creates their own record.
  let patientRow = null;
  if (patientToken) {
    const [known] = await db
      .select()
      .from(patients)
      .where(eq(patients.dashboardToken, patientToken));
    patientRow = known || null;
  }
  if (!patientRow) {
    patientRow = await upsertPatientForBooking({
      name: patient.name,
      phone: patient.phone,
      email: patient.email,
    });
  }

  try {
    const [row] = await db
      .insert(appointments)
      .values({
        patientName: patient.name,
        patientPhone: patient.phone,
        patientEmail: patient.email || null,
        problemNote: patient.note || null,
        patientId: patientRow.id,
        serviceId: service.id,
        mode: bookingMode,
        startAt,
        endAt,
        status: "pending_payment",
        amountInr: service.feeInr,
        holdExpiresAt,
        manageToken,
      })
      .returning();
    return { ok: true, appointment: row, dashboardToken: patientRow.dashboardToken };
  } catch (err) {
    // 23P01 = exclusion_violation (slot overlaps an active booking). Drizzle
    // wraps the driver error, so the code is on err.cause, not err.
    if (isExclusionViolation(err)) return { ok: false, reason: "slot_taken" };
    throw err;
  }
}

/** True when `startAt` is a slot the calendar currently offers as available
 * for this service and mode. The calendar is the single source of truth for
 * working hours, breaks, the horizon and the buffer, so booking and admin
 * rescheduling both ask it rather than re-deriving the rules. */
export async function isOfferedSlot(serviceId, mode, startAt) {
  const iso = new Date(startAt).toISOString();
  const cal = await getServiceCalendar(serviceId, { mode });
  for (const day of cal.days) {
    const slot = day.slots.find((s) => s.startAt === iso);
    if (slot) return slot.available;
  }
  return false;
}

/**
 * Confirm a paid appointment. Shared by the Razorpay webhook (payment.captured)
 * and the admin's discretionary "Confirm" override so both go through exactly
 * one code path. Stale holds are expired first so a lapsed hold never blocks a
 * restore; the row is then flipped to confirmed INSIDE the EXCLUSION predicate.
 * If the slot was retaken while the hold lapsed, Postgres raises 23P01 →
 * {ok:false, reason:"slot_taken"} (the webhook then auto-refunds). Already
 * confirmed → {ok:true, already:true}. Side effects (notifications, calendar)
 * belong to the caller so this stays reusable and directly testable.
 */
export async function confirmPaidAppointment(id, opts = {}) {
  const { paymentId = null, meetingLink } = opts;
  await expireStaleHolds();
  const [current] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, Number(id)));
  if (!current) return { ok: false, reason: "not_found" };
  if (current.status === "confirmed") {
    return { ok: true, already: true, appointment: current };
  }
  if (current.status === "cancelled" || current.status === "completed") {
    return { ok: false, reason: "bad_state", appointment: current };
  }
  const now = nowUtc();
  // paidAt is the receipt's payment date; keep the first stamp if a row is
  // ever confirmed twice (e.g. restored after a lapsed hold).
  const set = {
    status: "confirmed",
    needsReview: false,
    paidAt: current.paidAt ?? now,
    updatedAt: now,
  };
  if (paymentId) set.razorpayPaymentId = paymentId;
  if (meetingLink !== undefined) set.meetingLink = meetingLink || null;
  // An online consult that still has no link falls back to the clinic's
  // reusable room, so the doctor never has to paste one by hand. Keyed on
  // whether the caller PASSED a link, not on its truthiness: the admin
  // Confirm button always sends `meetingLink || null`, so clearing a
  // pre-filled field would otherwise write null and skip the fallback,
  // leaving a confirmed online consult with no link at all. Best-effort —
  // an unreadable settings row must not block a paid confirmation.
  const resolvedLink =
    "meetingLink" in set ? set.meetingLink : current.meetingLink;
  if (current.mode === "online" && !resolvedLink) {
    try {
      const { default_meet_link: fallback } = await getSettings([
        "default_meet_link",
      ]);
      if (fallback) set.meetingLink = fallback;
    } catch {
      /* leave the link unset */
    }
  }
  try {
    // Only flip the row from the status it was read in: a redelivered webhook
    // racing this one, or a cancel landing in between, must not confirm it
    // twice (two calendar events, two "confirmed" messages) or revive it.
    const [row] = await db
      .update(appointments)
      .set(set)
      .where(
        and(
          eq(appointments.id, Number(id)),
          eq(appointments.status, current.status),
        ),
      )
      .returning();
    if (!row) {
      const [latest] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, Number(id)));
      if (latest?.status === "confirmed") {
        return { ok: true, already: true, appointment: latest };
      }
      return { ok: false, reason: "bad_state", appointment: latest ?? current };
    }
    return { ok: true, appointment: row };
  } catch (err) {
    // 23P01 = exclusion_violation (the slot was retaken while the hold lapsed).
    // Drizzle can wrap the driver error, so check the cause and message too.
    if (isExclusionViolation(err)) {
      return { ok: false, reason: "slot_taken", appointment: current };
    }
    throw err;
  }
}

/** True when a thrown DB error is a Postgres exclusion_violation (23P01),
 * whether the code sits on the error, its cause, or only in the message. */
export function isExclusionViolation(err) {
  return (
    err?.code === "23P01" ||
    err?.cause?.code === "23P01" ||
    /23P01|exclusion|no_overlap|conflicting key/i.test(
      String(err?.message || "") + String(err?.cause?.message || ""),
    )
  );
}

/** Build a upi://pay deep link and the canonical payment params for a
 * booking. QR image is rendered from the same string (see src/lib/upi.js). */
export function buildUpiString({ upiId, payeeName, amountInr, note }) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: String(amountInr),
    cu: "INR",
  });
  if (note) params.set("tn", note);
  return `upi://pay?${params.toString()}`;
}

export { HOLD_MINUTES };
