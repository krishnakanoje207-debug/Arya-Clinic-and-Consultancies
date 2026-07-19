"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { createBooking, getServiceCalendar } from "@/lib/booking";
import { createRazorpayOrder, razorpayKeyId } from "@/lib/razorpay";
import { getSettings } from "@/lib/settings";
import { bookingInputSchema, intakeSchema, tokenSchema } from "@/lib/validation";
import { dispatchNotification } from "@/lib/notify";

/** Fetch the live slot calendar for a service+mode (called by the client
 * when the patient changes service or consultation type). */
export async function getCalendarAction(serviceId, mode) {
  const id = Number(serviceId);
  if (!id) return { service: null, days: [] };
  const cal = await getServiceCalendar(id, { mode });
  // Strip the full service row down to what the UI needs.
  return {
    service: cal.service
      ? {
          id: cal.service.id,
          title: cal.service.title,
          durationMinutes: cal.service.durationMinutes,
          feeInr: cal.service.feeInr,
          mode: cal.service.mode,
        }
      : null,
    mode: cal.mode,
    days: cal.days,
  };
}

/** Hold a slot: creates the pending_payment appointment, opens a server-side
 * Razorpay order (amount from the DB, in paise) and returns the public key id +
 * order id for Razorpay Checkout. The webhook confirms the booking once the
 * payment is captured. */
export async function createBookingAction(input) {
  const parsed = bookingInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "missing_details" };
  }
  const { serviceId, mode, startAtIso, patient } = parsed.data;

  const result = await createBooking({
    serviceId,
    mode,
    startAtIso,
    patient: {
      name: patient.name,
      phone: patient.phone.replace(/[ \-]/g, ""),
      email: patient.email || null,
    },
  });
  if (!result.ok) return result;

  const appt = result.appointment;

  let order;
  try {
    order = await createRazorpayOrder({
      amountInr: appt.amountInr,
      receipt: `appt_${appt.id}`,
      notes: { kind: "appointment", appointmentId: String(appt.id) },
    });
  } catch (err) {
    console.error("[razorpay] appointment order create failed:", err?.message || err);
    // Free the held slot at once so a failed payment init doesn't waste it.
    await db
      .update(appointments)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(appointments.id, appt.id));
    return { ok: false, reason: "payment_init_failed" };
  }

  await db
    .update(appointments)
    .set({ razorpayOrderId: order.id, updatedAt: new Date() })
    .where(eq(appointments.id, appt.id));

  const s = await getSettings(["payee_name"]);

  await dispatchNotification("booking_received", appt, { notifyDoctor: true });

  return {
    ok: true,
    booking: {
      id: appt.id,
      manageToken: appt.manageToken,
      dashboardToken: result.dashboardToken,
      amountInr: appt.amountInr,
    },
    payment: {
      keyId: razorpayKeyId(),
      orderId: order.id,
      amountInr: appt.amountInr,
      payeeName: s.payee_name || "Dr. Seema",
      prefill: {
        name: appt.patientName,
        contact: appt.patientPhone,
        email: appt.patientEmail || "",
      },
    },
  };
}

/** Poll the confirmation status of a booking after Checkout closes (the webhook
 * confirms asynchronously). Manage-token scoped so only the booker can read it. */
export async function getBookingStatusAction(manageToken) {
  const token = tokenSchema.safeParse(manageToken);
  if (!token.success) return { ok: false };
  const [appt] = await db
    .select({ status: appointments.status })
    .from(appointments)
    .where(eq(appointments.manageToken, token.data));
  if (!appt) return { ok: false };
  return { ok: true, status: appt.status, confirmed: appt.status === "confirmed" };
}

/** Attach optional pre-consultation intake answers to the appointment.
 * Whitelisted keys + bounded lengths only (see intakeSchema). */
export async function submitIntakeAction(manageToken, answers) {
  const token = tokenSchema.safeParse(manageToken);
  const parsed = intakeSchema.safeParse(answers || {});
  if (!token.success || !parsed.success) return { ok: false };
  await db
    .update(appointments)
    .set({ intakeAnswers: parsed.data, updatedAt: new Date() })
    .where(eq(appointments.manageToken, token.data));
  return { ok: true };
}
