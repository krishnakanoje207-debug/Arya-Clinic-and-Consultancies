import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, medicationOrders } from "@/db/schema";
import {
  refundRazorpayPayment,
  razorpayConfigured,
  verifyWebhookSignature,
} from "@/lib/razorpay";
import { confirmPaidAppointment } from "@/lib/booking";
import { markMedicationPaidRow } from "@/lib/medications";
import { dispatchNotification } from "@/lib/notify";
import { createAppointmentEvent } from "@/lib/gcal";

/**
 * Razorpay webhook (Phase 3). The single source of truth that a payment
 * succeeded — Checkout's client handler only starts polling; this route flips
 * the row.
 *
 * Security: the RAW request body is HMAC-SHA256'd with RAZORPAY_WEBHOOK_SECRET
 * and compared in constant time against x-razorpay-signature (400 on mismatch).
 *
 * payment.captured → confirm the appointment (reusing the exact admin-confirm
 * path so notifications + Google Calendar fire identically) or mark the
 * medication order paid. IDEMPOTENT: an already-confirmed/paid row is a 200
 * no-op. Edge case (locked spec): if the captured payment's slot was already
 * retaken (23P01) or the row is otherwise unpayable, auto-refund to source and
 * notify the patient to rebook.
 *
 * payment.failed → release an appointment hold early (frees the slot); a
 * medication order is left pending.
 *
 * A thrown/transient error returns 500 so Razorpay retries; every handled event
 * returns 200 quickly.
 */
export async function POST(req) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!verifyWebhookSignature(raw, signature)) {
    return new Response("invalid signature", { status: 400 });
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("invalid body", { status: 400 });
  }

  const event = body?.event;
  const payment = body?.payload?.payment?.entity || {};

  try {
    if (event === "payment.captured") {
      const action = await handleCaptured(payment);
      return Response.json({ ok: true, event, action });
    }
    if (event === "payment.failed") {
      const action = await handleFailed(payment);
      return Response.json({ ok: true, event, action });
    }
    return Response.json({ ok: true, event, action: "ignored" });
  } catch (err) {
    console.error("[razorpay webhook]", event, err?.message || err);
    return new Response("error", { status: 500 });
  }
}

async function handleCaptured(payment) {
  const orderId = payment.order_id;
  const paymentId = payment.id;
  if (!orderId) return "unmatched";

  const [appt] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.razorpayOrderId, orderId));
  if (appt) {
    if (appt.status === "confirmed") return "noop";
    const res = await confirmPaidAppointment(appt.id, { paymentId });
    if (res.ok) {
      if (res.already) return "noop";
      // Calendar first: a Meet link minted for this appointment has to exist
      // before the confirmation goes out, or the patient gets the stale one.
      const cal = await createAppointmentEvent(res.appointment);
      const confirmed = cal.meetingLink
        ? { ...res.appointment, meetingLink: cal.meetingLink }
        : res.appointment;
      await dispatchNotification("confirmed", confirmed, { includeIcs: true });
      return "confirmed";
    }
    // slot_taken / bad_state / not_found → the patient paid for a slot they can
    // no longer have: refund to source and prompt them to rebook.
    await autoRefundAppointment(appt, paymentId);
    return "refunded";
  }

  const [order] = await db
    .select()
    .from(medicationOrders)
    .where(eq(medicationOrders.razorpayOrderId, orderId));
  if (order) {
    if (order.status === "paid" || order.status === "shipped") return "noop";
    const res = await markMedicationPaidRow(order.id, { paymentId });
    return res.ok ? "paid" : "noop";
  }

  return "unmatched";
}

/** Refund a captured payment whose appointment slot is no longer available,
 * stamp the row, and notify the patient. The refund API call is best-effort:
 * even if it fails (or Razorpay is unconfigured, e.g. under test), the row is
 * still marked and the patient is still told, so no payment is silently lost. */
async function autoRefundAppointment(appt, paymentId) {
  let refundId = null;
  try {
    if (razorpayConfigured() && paymentId) {
      const refund = await refundRazorpayPayment(paymentId, {
        notes: { reason: "slot_unavailable", appointmentId: String(appt.id) },
      });
      refundId = refund?.id || null;
    }
  } catch (err) {
    console.error("[razorpay webhook] refund failed:", err?.message || err);
  }
  const [row] = await db
    .update(appointments)
    .set({
      razorpayPaymentId: paymentId || null,
      razorpayRefundId: refundId,
      needsReview: false,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, appt.id))
    .returning();
  await dispatchNotification("payment_refunded", row);
  return refundId;
}

async function handleFailed(payment) {
  const orderId = payment.order_id;
  if (!orderId) return "noop";
  const [appt] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.razorpayOrderId, orderId));
  if (appt && appt.status === "pending_payment") {
    await db
      .update(appointments)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(appointments.id, appt.id));
    return "released";
  }
  // Medication orders are left pending on a failed attempt (locked spec).
  return "noop";
}
