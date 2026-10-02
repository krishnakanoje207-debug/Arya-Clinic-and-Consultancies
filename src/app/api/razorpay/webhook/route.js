import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, medicationOrders } from "@/db/schema";
import {
  fetchRazorpayOrder,
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
    // Already refunded: a redelivered event must neither refund again nor,
    // if the slot has since freed up, confirm a consult whose money went back.
    if (appt.razorpayRefundId) return "noop";
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
    const refundId = await autoRefundAppointment(appt, paymentId);
    return refundId ? "refunded" : "refund_failed";
  }

  const [order] = await db
    .select()
    .from(medicationOrders)
    .where(eq(medicationOrders.razorpayOrderId, orderId));
  if (order) {
    if (order.status === "paid" || order.status === "shipped") return "noop";
    if (order.status === "cancelled") {
      // The doctor cancelled the order while the patient was still paying.
      // The money came in anyway: send it back, and keep the payment id on the
      // row so it shows in the admin even if the refund call fails.
      if (order.razorpayRefundId) return "noop";
      const refundId = await tryRefund(paymentId, {
        reason: "order_cancelled",
        medicationOrderId: String(order.id),
      });
      await db
        .update(medicationOrders)
        .set({
          razorpayPaymentId: paymentId || null,
          razorpayRefundId: refundId,
          updatedAt: new Date(),
        })
        .where(eq(medicationOrders.id, order.id));
      return refundId ? "refunded" : "refund_failed";
    }
    const res = await markMedicationPaidRow(order.id, { paymentId });
    return res.ok ? "paid" : "noop";
  }

  // No row holds this order any more: the patient changed the medicine
  // duration between two taps of Pay (a new price needs a new Razorpay order,
  // which replaced this one on the row) and then completed the older one.
  // The order itself still says it was ours; send the money back so the
  // patient can pay the current order. Anything else is left alone.
  const rzpOrder = await fetchRazorpayOrder(orderId);
  if (rzpOrder?.notes?.kind === "medication") {
    const refundId = await tryRefund(paymentId, {
      reason: "superseded_order",
      medicationOrderId: String(rzpOrder.notes.medicationOrderId || ""),
    });
    if (!refundId) {
      console.error(
        `[razorpay webhook] refund of superseded medication payment ${paymentId} failed — refund it from the Razorpay dashboard`,
      );
    }
    return refundId ? "refunded" : "refund_failed";
  }
  return "unmatched";
}

/** Refund a captured payment in full. Returns the refund id, or null when
 * Razorpay is unconfigured or the call failed (logged, never thrown). */
async function tryRefund(paymentId, notes) {
  try {
    if (razorpayConfigured() && paymentId) {
      const refund = await refundRazorpayPayment(paymentId, { notes });
      return refund?.id || null;
    }
  } catch (err) {
    console.error("[razorpay webhook] refund failed:", err?.message || err);
  }
  return null;
}

/** Refund a captured payment whose appointment slot is no longer available,
 * stamp the row, and tell the patient. If the refund could not be made, the
 * patient is NOT told it was, and the row is flagged for the doctor instead
 * (it shows under "needs attention" on the dashboard) so the money is never
 * silently kept. */
async function autoRefundAppointment(appt, paymentId) {
  const refundId = await tryRefund(paymentId, {
    reason: "slot_unavailable",
    appointmentId: String(appt.id),
  });
  const [row] = await db
    .update(appointments)
    .set({
      razorpayPaymentId: paymentId || null,
      razorpayRefundId: refundId,
      needsReview: !refundId,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, appt.id))
    .returning();
  if (refundId) await dispatchNotification("payment_refunded", row);
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
    // Guarded in the UPDATE too: a later attempt on the same order may have
    // been captured and confirmed in between, and must not be expired.
    await db
      .update(appointments)
      .set({ status: "expired", updatedAt: new Date() })
      .where(
        and(eq(appointments.id, appt.id), eq(appointments.status, "pending_payment")),
      );
    return "released";
  }
  // Medication orders are left pending on a failed attempt (locked spec).
  return "noop";
}
