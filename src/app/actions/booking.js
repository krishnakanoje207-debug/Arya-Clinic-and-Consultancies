"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import {
  createBooking,
  getServiceCalendar,
  submitUtr,
} from "@/lib/booking";
import { upiQrDataUrl } from "@/lib/upi";
import { getSettings } from "@/lib/settings";
import {
  bookingInputSchema,
  intakeSchema,
  tokenSchema,
  utrSchema,
} from "@/lib/validation";
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

/** Hold a slot: creates the pending_payment appointment and returns the
 * UPI payment details (QR + deep link) for the payment window. */
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
  const s = await getSettings(["upi_id", "upi_number", "payee_name"]);

  let qr = null;
  let deepLink = null;
  if (s.upi_id) {
    const note = `Consult ${appt.id}`;
    qr = await upiQrDataUrl({
      upiId: s.upi_id,
      payeeName: s.payee_name || "Dr. Seema",
      amountInr: appt.amountInr,
      note,
    });
    const params = new URLSearchParams({
      pa: s.upi_id,
      pn: s.payee_name || "Dr. Seema",
      am: String(appt.amountInr),
      cu: "INR",
      tn: note,
    });
    deepLink = `upi://pay?${params.toString()}`;
  }

  await dispatchNotification("booking_received", appt, { notifyDoctor: true });

  return {
    ok: true,
    booking: {
      id: appt.id,
      manageToken: appt.manageToken,
      dashboardToken: result.dashboardToken,
      amountInr: appt.amountInr,
      holdExpiresAt: appt.holdExpiresAt,
    },
    upi: {
      upiId: s.upi_id || "",
      upiNumber: s.upi_number || "",
      payeeName: s.payee_name || "Dr. Seema",
      qrDataUrl: qr,
      deepLink,
    },
  };
}

/** Record the patient's UPI transaction reference. */
export async function submitUtrAction(manageToken, utr) {
  const token = tokenSchema.safeParse(manageToken);
  const cleanUtr = utrSchema.safeParse(String(utr || "").trim());
  if (!token.success || !cleanUtr.success) {
    return { ok: false, reason: "missing_utr" };
  }
  const res = await submitUtr(token.data, cleanUtr.data);
  if (res.ok && !res.alreadyConfirmed && res.appointment) {
    await dispatchNotification("payment_received", res.appointment, {
      notifyDoctor: true,
    });
  }
  return { ok: res.ok, needsReview: res.needsReview, alreadyConfirmed: res.alreadyConfirmed };
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
