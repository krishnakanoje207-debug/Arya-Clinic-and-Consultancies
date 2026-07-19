import crypto from "crypto";

/**
 * Server-only Razorpay client. Zero npm deps: we call the REST API with fetch
 * and HTTP Basic auth (key_id:key_secret), matching the project's fetch-first
 * style (see src/lib/gcal.js). The key id is public and may be sent to the
 * browser for Checkout; the secret and webhook secret NEVER leave the server
 * and are never logged.
 *
 * Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET.
 */

const API = "https://api.razorpay.com/v1";

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** The public key id — safe to hand to Razorpay Checkout in the browser. */
export function razorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID || "";
}

function authHeader() {
  const token = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`,
  ).toString("base64");
  return `Basic ${token}`;
}

/**
 * Create an order. Amount comes from the DB (service fee / doctor-typed
 * medication price) and is converted to PAISE here — never taken from the
 * client. `notes` carry the appointment / medication order id so the webhook
 * can correlate the captured payment back to its row.
 */
export async function createRazorpayOrder({ amountInr, receipt, notes }) {
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { authorization: authHeader(), "content-type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(Number(amountInr) * 100),
      currency: "INR",
      receipt,
      notes,
    }),
  });
  if (!res.ok) {
    throw new Error(`Razorpay order create: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/** Refund a captured payment to source (used by the webhook when a paid slot
 * was already taken). Full refund by default. */
export async function refundRazorpayPayment(paymentId, { notes } = {}) {
  const res = await fetch(
    `${API}/payments/${encodeURIComponent(paymentId)}/refund`,
    {
      method: "POST",
      headers: { authorization: authHeader(), "content-type": "application/json" },
      body: JSON.stringify(notes ? { notes } : {}),
    },
  );
  if (!res.ok) {
    throw new Error(`Razorpay refund: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/**
 * Verify a webhook's HMAC-SHA256 signature: hex digest of the RAW request body
 * keyed by RAZORPAY_WEBHOOK_SECRET, compared against x-razorpay-signature in
 * constant time. Returns false on any mismatch / missing input.
 */
export function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
