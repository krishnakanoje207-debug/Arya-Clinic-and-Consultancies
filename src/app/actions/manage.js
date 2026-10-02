"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { appointments, services } from "@/db/schema";
import { tokenSchema } from "@/lib/validation";
import {
  HOLD_MINUTES,
  expireStaleHolds,
  isExclusionViolation,
  isOfferedSlot,
  overlapsFilledSlot,
} from "@/lib/booking";
import { addMinutes, nowUtc } from "@/lib/time";
import { dispatchNotification } from "@/lib/notify";
import { getSettings } from "@/lib/settings";
import { deleteAppointmentEvent, updateAppointmentEvent } from "@/lib/gcal";

/** Confirmed appointments can't be changed online within the cutoff window
 * before their start time (default 4h) — the patient must contact the
 * clinic. Unpaid/pending bookings are always changeable. */
async function withinCutoff(appt) {
  if (appt.status !== "confirmed") return false;
  const { cancel_cutoff_hours } = await getSettings(["cancel_cutoff_hours"]);
  const hours = Number(cancel_cutoff_hours) || 0;
  if (hours <= 0) return false;
  const msUntil = new Date(appt.startAt).getTime() - nowUtc().getTime();
  return msUntil < hours * 3600_000;
}

/** Cancel a booking from its secure manage link. Frees the slot instantly
 * (the exclusion constraint stops applying to cancelled rows). No login
 * needed — possession of the token is the authorization. */
export async function cancelByToken(token) {
  const parsedToken = tokenSchema.safeParse(token);
  if (!parsedToken.success) return { ok: false, reason: "not_found" };
  const [appt] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.manageToken, parsedToken.data));
  if (!appt) return { ok: false, reason: "not_found" };
  if (appt.status === "completed") return { ok: false, reason: "completed" };
  if (appt.status === "cancelled") return { ok: true, already: true };
  if (await withinCutoff(appt)) return { ok: false, reason: "too_late" };

  const [row] = await db
    .update(appointments)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(appointments.id, appt.id))
    .returning();
  if (row) {
    await dispatchNotification("cancelled", row);
    await deleteAppointmentEvent(row);
  }
  return { ok: true };
}

/**
 * Self-service reschedule (plan §6): moves the SAME appointment row to
 * new times, so status and any verified payment carry over and the old
 * slot frees atomically — the patient can never hold two slots. The
 * EXCLUSION constraint re-checks overlap on UPDATE; losing the race for
 * the new slot returns slot_taken instead of corrupting anything.
 */
export async function rescheduleByToken(token, startAtIso) {
  const parsedToken = tokenSchema.safeParse(token);
  if (!parsedToken.success) return { ok: false, reason: "not_found" };

  const startAt = new Date(startAtIso);
  if (Number.isNaN(startAt.getTime()) || startAt <= nowUtc()) {
    return { ok: false, reason: "bad_time" };
  }

  const [row] = await db
    .select({ appt: appointments, duration: services.durationMinutes })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(eq(appointments.manageToken, parsedToken.data));
  if (!row) return { ok: false, reason: "not_found" };

  const { appt, duration } = row;
  if (!["pending_payment", "confirmed"].includes(appt.status)) {
    return { ok: false, reason: "not_reschedulable" };
  }
  // Cutoff applies to the CURRENT (old) appointment time — can't shuffle a
  // confirmed slot at the last minute.
  if (await withinCutoff(appt)) return { ok: false, reason: "too_late" };

  const endAt = addMinutes(startAt, duration || 30);

  // The new time must be a slot the calendar offers, exactly as for a new
  // booking: working hours, breaks, days off, the horizon and the buffer live
  // only there, so without this a crafted request could move straight past
  // them. (The admin's own reschedule deliberately skips this.)
  if (!(await isOfferedSlot(appt.serviceId, appt.mode, startAt))) {
    return { ok: false, reason: "slot_taken" };
  }

  // Can't move onto a slot the doctor marked as booked (deliberate scarcity).
  if (await overlapsFilledSlot(startAt, endAt)) {
    return { ok: false, reason: "slot_taken" };
  }

  await expireStaleHolds();

  try {
    const [updated] = await db
      .update(appointments)
      .set({
        startAt,
        endAt,
        // A fresh hold window for unpaid bookings; confirmed stays confirmed.
        holdExpiresAt:
          appt.status === "pending_payment"
            ? addMinutes(nowUtc(), HOLD_MINUTES)
            : appt.holdExpiresAt,
        reminderSent: false, // the reminder should fire for the new date
        updatedAt: nowUtc(),
      })
      // expireStaleHolds above may just have expired this very row (an unpaid
      // hold that lapsed); a dead booking must not be moved and announced.
      .where(
        and(
          eq(appointments.id, appt.id),
          inArray(appointments.status, ["pending_payment", "confirmed"]),
        ),
      )
      .returning();
    if (!updated) return { ok: false, reason: "not_reschedulable" };
    await dispatchNotification("rescheduled", updated);
    // Update (or create-if-confirmed-and-missing) the calendar event.
    await updateAppointmentEvent(updated);
    return { ok: true };
  } catch (err) {
    if (isExclusionViolation(err)) return { ok: false, reason: "slot_taken" };
    throw err;
  }
}
