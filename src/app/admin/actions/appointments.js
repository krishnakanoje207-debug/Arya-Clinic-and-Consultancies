"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { expireStaleHolds } from "@/lib/booking";
import { dispatchNotification } from "@/lib/notify";

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
  await expireStaleHolds(); // lapsed holds must not block a restore
  let row;
  try {
    [row] = await db
      .update(appointments)
      .set({
        status: "confirmed",
        needsReview: false,
        meetingLink: meetingLink || null,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, Number(id)))
      .returning();
  } catch (err) {
    if (err?.code === "23P01") return { ok: false, reason: "slot_taken" };
    throw err;
  }
  if (row) {
    await dispatchNotification("confirmed", row, { includeIcs: true });
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
  if (row) await dispatchNotification("cancelled", row);
  revalidatePath("/admin/appointments");
  return { ok: true };
}

export async function completeAppointment(id) {
  await guard();
  await db
    .update(appointments)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(appointments.id, Number(id)));
  revalidatePath("/admin/appointments");
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

export async function saveDoctorNotes(id, notes) {
  await guard();
  await db
    .update(appointments)
    .set({ doctorNotes: notes, updatedAt: new Date() })
    .where(eq(appointments.id, Number(id)));
  revalidatePath("/admin/appointments");
}
