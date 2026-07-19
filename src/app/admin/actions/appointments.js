"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { confirmPaidAppointment } from "@/lib/booking";
import { completeAppointmentRow, shiftTodaysAppointments } from "@/lib/admin";
import { dispatchNotification } from "@/lib/notify";
import { appendCompletedAppointmentRow } from "@/lib/sheets";
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
    await dispatchNotification("confirmed", res.appointment, { includeIcs: true });
    // Best-effort Google Calendar event (no-op when unconfigured, never throws).
    await createAppointmentEvent(res.appointment);
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
 * Mark a confirmed consult completed: sets completed_at and, best-effort,
 * appends the full row to the doctor's Google Sheet. The calendar event is
 * intentionally LEFT in place (the consult happened). Both Google calls no-op
 * when unconfigured and never throw.
 */
export async function markAppointmentCompleted(id) {
  await guard();
  const row = await completeAppointmentRow(id);
  if (row) {
    await appendCompletedAppointmentRow(row.id);
  }
  revalidatePath("/admin/appointments");
  revalidatePath("/admin/queue");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * "Running late": shift every still-confirmed appointment in today's IST day
 * later by minutes ∈ {15,30,45}, preserving order. For each shifted row we
 * best-effort patch its calendar event and send a "rescheduled" notification
 * (both never throw by design). Returns { ok, count }. */
export async function runningLate(minutes) {
  await guard();
  const shifted = await shiftTodaysAppointments(minutes);
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

export async function saveDoctorNotes(id, notes) {
  await guard();
  await db
    .update(appointments)
    .set({ doctorNotes: notes, updatedAt: new Date() })
    .where(eq(appointments.id, Number(id)));
  revalidatePath("/admin/appointments");
}
