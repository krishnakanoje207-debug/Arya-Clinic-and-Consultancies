import { randomUUID } from "crypto";
import { and, eq, gte, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  availabilityRules,
  services,
  slotOverrides,
} from "@/db/schema";
import { IST_ZONE, addMinutes, istToday, istWeekday, nowUtc } from "@/lib/time";
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

/**
 * Build the calendar for a service: for each of the next `days` IST days,
 * derive bookable slots from availability_rules minus slot_overrides minus
 * active appointments. Booked/held/past slots are returned with
 * available:false so the UI can grey them out ("Unavailable").
 */
export async function getServiceCalendar(serviceId, {
  mode,
  days = DEFAULT_HORIZON_DAYS,
} = {}) {
  await expireStaleHolds();

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
  const dateStrs = Array.from({ length: days }, (_, i) =>
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
  const activeRanges = await loadActiveRanges(fromUtc, toUtc);
  const now = nowUtc().getTime();

  const out = [];
  for (const dateStr of dateStrs) {
    const wd = istWeekday(dateStr);
    const dayOverrides = overrides.filter((o) => o.onDate === dateStr);

    // Whole-day block (blocked override with no start_time) closes the day.
    const fullBlock = dayOverrides.some(
      (o) => o.kind === "blocked" && !o.startTime,
    );
    if (fullBlock) {
      out.push({ date: dateStr, weekday: wd, slots: [] });
      continue;
    }

    const blockedRanges = dayOverrides
      .filter((o) => o.kind === "blocked" && o.startTime && o.endTime)
      .map((o) => [timeToMinutes(o.startTime), timeToMinutes(o.endTime)]);

    // Base windows = weekly rules for this weekday + any "extra" overrides.
    const windows = [
      ...rules
        .filter((r) => r.weekday === wd)
        .map((r) => [timeToMinutes(r.startTime), timeToMinutes(r.endTime)]),
      ...dayOverrides
        .filter((o) => o.kind === "extra" && o.startTime && o.endTime)
        .map((o) => [timeToMinutes(o.startTime), timeToMinutes(o.endTime)]),
    ];

    const slots = [];
    for (const [ws, we] of windows) {
      for (const [ps, pe] of subtractRanges(ws, we, blockedRanges)) {
        for (let s = ps; s + slotLen <= pe; s += slotLen) {
          const startUtc = istMinutesToUtc(dateStr, s);
          const endUtc = istMinutesToUtc(dateStr, s + slotLen);
          const sMs = startUtc.getTime();
          const eMs = endUtc.getTime();
          const isPast = sMs <= now;
          const isTaken = activeRanges.some(
            ([as, ae]) => sMs < ae && as < eMs,
          );
          slots.push({
            startAt: startUtc.toISOString(),
            endAt: endUtc.toISOString(),
            label: DateTime.fromJSDate(startUtc)
              .setZone(IST_ZONE)
              .toFormat("hh:mm a"),
            available: !isPast && !isTaken,
          });
        }
      }
    }
    slots.sort((a, b) => a.startAt.localeCompare(b.startAt));
    out.push({ date: dateStr, weekday: wd, slots });
  }

  return { service, mode: targetMode, days: out };
}

/**
 * Create a booking race-safely. The Postgres EXCLUSION constraint is the
 * real guard: even two simultaneous requests for the same slot cannot both
 * insert — the loser gets a 23P01 and we report the slot as taken. We
 * expire stale holds first so a lapsed hold never falsely blocks.
 *
 * Returns { ok, appointment? , reason? }.
 */
export async function createBooking({ serviceId, mode, startAtIso, patient }) {
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
  const holdExpiresAt = addMinutes(nowUtc(), HOLD_MINUTES);
  const manageToken = randomUUID();

  await expireStaleHolds();

  try {
    const [row] = await db
      .insert(appointments)
      .values({
        patientName: patient.name,
        patientPhone: patient.phone,
        patientEmail: patient.email || null,
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
    return { ok: true, appointment: row };
  } catch (err) {
    // 23P01 = exclusion_violation (slot overlaps an active booking).
    if (err?.code === "23P01") return { ok: false, reason: "slot_taken" };
    throw err;
  }
}

/** Submit a UTR reference. Accepted even after the hold expired — if late,
 * the row is flagged for admin review so no payment is silently lost
 * (plan §3.2 "patient paid but the hold expired"). */
export async function submitUtr(manageToken, utr) {
  const [appt] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.manageToken, manageToken));
  if (!appt) return { ok: false, reason: "not_found" };
  if (appt.status === "confirmed") return { ok: true, alreadyConfirmed: true };

  const now = nowUtc();
  const lateOrExpired =
    appt.status === "expired" ||
    (appt.holdExpiresAt && new Date(appt.holdExpiresAt).getTime() < now.getTime());

  await db
    .update(appointments)
    .set({
      utr,
      utrSubmittedAt: now,
      needsReview: lateOrExpired,
      updatedAt: now,
    })
    .where(eq(appointments.id, appt.id));

  return { ok: true, needsReview: lateOrExpired };
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
