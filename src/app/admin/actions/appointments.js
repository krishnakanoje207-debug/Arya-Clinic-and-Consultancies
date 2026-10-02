"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, services } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { confirmPaidAppointment, expireStaleHolds } from "@/lib/booking";
import { addMinutes, istToday, nowUtc } from "@/lib/time";
import { completeAppointmentRow, shiftTodaysAppointments } from "@/lib/admin";
import { dispatchNotification } from "@/lib/notify";
import { appendCompletedAppointmentRow } from "@/lib/sheets";
import { parseConsultationRecord } from "@/lib/consultations";
import {
  createAppointmentEvent,
  deleteAppointmentEvent,
  updateAppointmentEvent,
} from "@/lib/gcal";

async function guard() {
  const s = await requireAdmin();
  if (!s.authed) throw new Error("Unauthorized");
}

/**
 * Verify the UPI credit and confirm. Optionally attach a video link that
 * rides along in the confirmation/reminder messages.
 *
 * Confirming a lapsed/expired booking (the "paid but hold expired" flow,
 * plan §3.2) moves the row back inside the EXCLUSION constraint's
 * predicate — Postgres re-checks the overlap, and if someone else took
 * the slot meanwhile the UPDATE fails with 23P01. That is surfaced as
 * {ok:false, reason:"slot_taken"} so the doctor can offer a reschedule
 * instead of hitting an unhandled error.
 */
export async function confirmAppointment(id, meetingLink) {
  await guard();
  const res = await confirmPaidAppointment(id, { meetingLink: meetingLink || null });
  if (!res.ok) return res; // slot_taken / bad_state / not_found
  if (!res.already && res.appointment) {
    // Best-effort Google Calendar event (no-op when unconfigured, never
    // throws). It runs BEFORE the notification so a Meet link generated for
    // this appointment is the one the patient is told about.
    const cal = await createAppointmentEvent(res.appointment);
    const appt = cal.meetingLink
      ? { ...res.appointment, meetingLink: cal.meetingLink }
      : res.appointment;
    await dispatchNotification("confirmed", appt, { includeIcs: true });
  }
  revalidatePath("/admin/appointments");
  revalidatePath("/admin");
  return { ok: true };
}

export async function cancelAppointment(id) {
  await guard();
  const [row] = await db
    .update(appointments)
    .set({ status: "cancelled", needsReview: false, updatedAt: new Date() })
    .where(eq(appointments.id, Number(id)))
    .returning();
  if (row) {
    await dispatchNotification("cancelled", row);
    await deleteAppointmentEvent(row);
  }
  revalidatePath("/admin/appointments");
  revalidatePath("/admin/queue");
  return { ok: true };
}

/**
 * Mark a confirmed consult completed with the doctor's consultation record
 * (symptoms, medicines, next appointment date): sets completed_at and,
 * best-effort, appends the full row to the doctor's Google Sheet. The
 * calendar event is intentionally LEFT in place (the consult happened). Both
 * Google calls no-op when unconfigured and never throw.
 */
export async function markAppointmentCompleted(id, input) {
  await guard();
  const record = parseConsultationRecord(input);
  if (!record) return { ok: false, reason: "invalid" };
  // The date picker's minimum is only a hint; a typed date can still be past.
  if (record.nextAppointmentOn && record.nextAppointmentOn < istToday()) {
    return { ok: false, reason: "past_date" };
  }
  const row = await completeAppointmentRow(id, record);
  if (!row) return { ok: false, reason: "bad_state" };
  await appendCompletedAppointmentRow(row.id);
  revalidatePath("/admin/appointments");
  revalidatePath("/admin/queue");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Correct the consultation record of an already-completed appointment (e.g.
 * change the next appointment date). The patient dashboard reads the new
 * value immediately; the Google Sheet row appended at completion is NOT
 * rewritten — the CSV download always reflects the current record.
 */
export async function saveConsultationRecord(id, input) {
  await guard();
  const record = parseConsultationRecord(input);
  if (!record) return { ok: false, reason: "invalid" };
  const [row] = await db
    .update(appointments)
    .set({ ...record, updatedAt: new Date() })
    .where(and(eq(appointments.id, Number(id)), eq(appointments.status, "completed")))
    .returning({ id: appointments.id });
  if (!row) return { ok: false, reason: "bad_state" };
  revalidatePath("/admin/appointments");
  return { ok: true };
}

/**
 * "Running late": shift every still-confirmed appointment in today's IST day
 * later by minutes ∈ {15,30,45}, preserving order. For each shifted row we
 * best-effort patch its calendar event and send a "rescheduled" notification
 * (both never throw by design). Returns { ok, count }. */
export async function runningLate(minutes) {
  await guard();
  // A lapsed hold still sits inside the exclusion constraint until expired,
  // and would refuse the shift as if it were a real booking.
  await expireStaleHolds();
  let shifted;
  try {
    shifted = await shiftTodaysAppointments(minutes);
  } catch (err) {
    // The shift is one atomic batch: if it would run into a booking outside
    // it (a patient mid-payment, say), nothing moves.
    if (err?.code === "23P01" || err?.cause?.code === "23P01") {
      return { ok: false, reason: "slot_taken" };
    }
    throw err;
  }
  for (const appt of shifted) {
    await updateAppointmentEvent(appt);
    await dispatchNotification("rescheduled", appt);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/queue");
  revalidatePath("/admin/appointments");
  return { ok: true, count: shifted.length };
}

/** Clear the "paid but hold expired" flag once handled. */
export async function clearReview(id) {
  await guard();
  await db
    .update(appointments)
    .set({ needsReview: false, updatedAt: new Date() })
    .where(eq(appointments.id, Number(id)));
  revalidatePath("/admin/appointments");
  revalidatePath("/admin");
}

export async function saveMeetingLink(id, meetingLink) {
  await guard();
  const [row] = await db
    .update(appointments)
    .set({ meetingLink: meetingLink?.trim() || null, updatedAt: new Date() })
    .where(eq(appointments.id, Number(id)))
    .returning();
  if (row?.status === "confirmed") {
    await updateAppointmentEvent(row);
  }
  revalidatePath("/admin/appointments");
}

/**
 * Move one appointment to a new date and time from the admin panel.
 *
 * Unlike the patient's own reschedule this deliberately does NOT require the
 * new time to be on the offered grid: when the doctor is unavailable she has
 * to be able to put a patient wherever actually suits, including outside her
 * published hours. The one rule that still binds is the database exclusion
 * constraint — she cannot land on top of another live appointment (23P01).
 *
 * The patient is notified with the existing "rescheduled" template and the
 * calendar event is moved to match.
 */
export async function rescheduleAppointment(id, startAtIso) {
  await guard();

  const startAt = new Date(startAtIso);
  if (Number.isNaN(startAt.getTime())) return { ok: false, reason: "bad_time" };
  if (startAt <= nowUtc()) return { ok: false, reason: "in_past" };

  const [row] = await db
    .select({ appt: appointments, duration: services.durationMinutes })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(eq(appointments.id, Number(id)));
  if (!row) return { ok: false, reason: "not_found" };
  if (!["pending_payment", "confirmed"].includes(row.appt.status)) {
    return { ok: false, reason: "not_reschedulable" };
  }

  // A lapsed hold would otherwise refuse the move as if it were a booking.
  await expireStaleHolds();
  try {
    const [updated] = await db
      .update(appointments)
      .set({
        startAt,
        endAt: addMinutes(startAt, row.duration || 30),
        reminderSent: false, // the reminder must fire for the new date
        updatedAt: nowUtc(),
      })
      .where(eq(appointments.id, row.appt.id))
      .returning();
    if (updated) {
      await dispatchNotification("rescheduled", updated);
      await updateAppointmentEvent(updated);
    }
    revalidatePath("/admin/appointments");
    revalidatePath("/admin/queue");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    if (err?.code === "23P01" || err?.cause?.code === "23P01") {
      return { ok: false, reason: "slot_taken" };
    }
    throw err;
  }
}

export async function saveDoctorNotes(id, notes) {
  await guard();
  await db
    .update(appointments)
    .set({ doctorNotes: notes, updatedAt: new Date() })
    .where(eq(appointments.id, Number(id)));
  revalidatePath("/admin/appointments");
}
