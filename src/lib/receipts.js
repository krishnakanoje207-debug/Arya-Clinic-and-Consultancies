import { createHmac, timingSafeEqual } from "crypto";

/**
 * Payment receipts — one per consultation payment, one per medicine payment.
 *
 * A receipt link carries only an HMAC of (kind, id), never the patient's
 * dashboard token: patients forward receipts to insurers and employers, and
 * the dashboard link would open their whole record. Signed with AUTH_SECRET;
 * rotating it invalidates old receipt links, and the dashboard and admin mint
 * fresh ones on every render. Server-only (node crypto).
 */

export const RECEIPT_KINDS = ["consultation", "medicine"];

function sign(kind, id) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret)
    .update(`receipt:${kind}:${Number(id)}`)
    .digest("base64url")
    .slice(0, 22);
}

export function receiptPath(kind, id) {
  return `/receipt/${kind}/${Number(id)}/${sign(kind, id)}`;
}

export function verifyReceipt(kind, id, sig) {
  if (!RECEIPT_KINDS.includes(kind) || !/^\d{1,10}$/.test(String(id))) return false;
  if (typeof sig !== "string") return false;
  const expected = Buffer.from(sign(kind, id));
  const given = Buffer.from(sig);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Receipt number printed on the page: C-00012 / M-00004. Built from the row
 * id, so numbers are unique but not gap-free (unpaid holds use ids too). */
export function receiptNumber(kind, id) {
  return `${kind === "medicine" ? "M" : "C"}-${String(id).padStart(5, "0")}`;
}

/* Only money the clinic still holds gets a receipt. Cancelled consultations
   are left out: their refunds are made by hand in Razorpay, so the site can't
   tell whether the payment still stands. */
export function consultationHasReceipt(a) {
  return (
    (a.status === "confirmed" || a.status === "completed") &&
    !a.razorpayRefundId &&
    Boolean(a.paidAt)
  );
}

export function medicineHasReceipt(o) {
  return (
    (o.status === "paid" || o.status === "shipped") &&
    !o.razorpayRefundId &&
    Boolean(o.paidAt) &&
    o.amountInr != null
  );
}
