"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { medicationOrders, patients } from "@/db/schema";
import { beginMedicationPayment } from "@/lib/medications";
import { createRazorpayOrder, razorpayKeyId } from "@/lib/razorpay";
import { getSettings } from "@/lib/settings";
import { tokenSchema } from "@/lib/validation";

/**
 * Begin a Razorpay payment for a medication order: validates + records the
 * chosen duration/address (server-priced), opens a server-side Razorpay order
 * (amount in paise from the DB) and returns the public key id + order id for
 * Checkout. The webhook marks the order paid once the payment is captured.
 */
export async function startMedicationPaymentAction(dashboardToken, payload) {
  const res = await beginMedicationPayment(dashboardToken, payload);
  if (!res.ok) return res;
  const { order, patient } = res;

  let rzp;
  try {
    rzp = await createRazorpayOrder({
      amountInr: order.amountInr,
      receipt: `meds_${order.id}`,
      notes: { kind: "medication", medicationOrderId: String(order.id) },
    });
  } catch (err) {
    console.error("[razorpay] medication order create failed:", err?.message || err);
    return { ok: false, reason: "payment_init_failed" };
  }

  await db
    .update(medicationOrders)
    .set({ razorpayOrderId: rzp.id, updatedAt: new Date() })
    .where(eq(medicationOrders.id, order.id));

  const s = await getSettings(["payee_name"]);

  return {
    ok: true,
    payment: {
      keyId: razorpayKeyId(),
      orderId: rzp.id,
      amountInr: order.amountInr,
      payeeName: s.payee_name || "Dr. Seema",
      prefill: {
        name: patient.name,
        contact: patient.phone,
        email: patient.email || "",
      },
    },
  };
}

/** Poll a medication order's status after Checkout closes (the webhook marks it
 * paid asynchronously). Dashboard-token scoped + ownership-checked. */
export async function getMedicationStatusAction(dashboardToken, orderId) {
  const token = tokenSchema.safeParse(dashboardToken);
  if (!token.success) return { ok: false };
  const [patient] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.dashboardToken, token.data));
  if (!patient) return { ok: false };
  const [order] = await db
    .select({ status: medicationOrders.status, patientId: medicationOrders.patientId })
    .from(medicationOrders)
    .where(eq(medicationOrders.id, Number(orderId)));
  if (!order || order.patientId !== patient.id) return { ok: false };
  return {
    ok: true,
    status: order.status,
    paid: order.status === "paid" || order.status === "shipped",
  };
}
