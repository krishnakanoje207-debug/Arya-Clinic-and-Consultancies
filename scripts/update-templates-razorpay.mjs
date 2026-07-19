/**
 * Migrate the seeded notification templates from the old manual-UPI/UTR wording
 * to the Razorpay auto-confirm wording, and add the new `payment_refunded`
 * event. Safe to run against local AND production:
 *
 *   node --env-file=.env scripts/update-templates-razorpay.mjs
 *
 * Every UPDATE is GUARDED — it only rewrites a row whose body still matches the
 * exact original seed text, so a template the doctor has edited by hand is left
 * untouched. The payment_refunded rows are only inserted if that event has no
 * rows yet. Re-running is a no-op. (Mirrors the guarded-UPDATE pattern used for
 * earlier template migrations.)
 */
import { neon, neonConfig } from "@neondatabase/serverless";

if (process.env.DATABASE_URL?.includes("db.localtest.me")) {
  neonConfig.fetchEndpoint = (host) => `http://${host}:4444/sql`;
}
const sql = neon(process.env.DATABASE_URL);

const OLD_BOOKING =
  "Hi {patient_name}, your {service} slot on {date} at {time} is held for 15 minutes. Please pay ₹{amount} via UPI ({upi_id}) and enter your transaction reference to confirm.";
const NEW_BOOKING =
  "Hi {patient_name}, your {service} slot on {date} at {time} is held for 15 minutes. Please pay ₹{amount} securely in the payment window to confirm your booking. Track it on your dashboard: {dashboard_link}";

const OLD_PAYMENT =
  "Thanks {patient_name}. We've received your payment reference for {date} {time}. The doctor will verify and confirm shortly. Track the status anytime on your dashboard: {dashboard_link}";
const NEW_PAYMENT =
  "Thanks {patient_name}. Your payment of ₹{amount} for {date} {time} was received and your appointment is being confirmed automatically. Track it on your dashboard: {dashboard_link}";

const OLD_PAYMENT_SUBJECT = "Payment received — pending verification";
const NEW_PAYMENT_SUBJECT = "Payment received — confirming your appointment";

const REFUND_SUBJECT = "Payment refunded — please rebook";
const REFUND_BODY =
  "Hi {patient_name}, the {date} {time} slot was taken before your payment completed, so we have refunded ₹{amount} to your original payment method (5–7 working days). Please rebook from your dashboard: {dashboard_link}";

async function main() {
  // 1. booking_received body (email + sms share the same body text).
  const b = await sql`
    UPDATE message_templates SET body = ${NEW_BOOKING}
    WHERE event = 'booking_received' AND body = ${OLD_BOOKING}
    RETURNING id`;
  console.log(
    b.length
      ? `✅ booking_received: updated ${b.length} row(s) to Razorpay wording.`
      : "⚠️  booking_received: no row matched the original seed body (already migrated or hand-edited) — left as is.",
  );

  // 2. payment_received body.
  const p = await sql`
    UPDATE message_templates SET body = ${NEW_PAYMENT}
    WHERE event = 'payment_received' AND body = ${OLD_PAYMENT}
    RETURNING id`;
  console.log(
    p.length
      ? `✅ payment_received: updated ${p.length} body row(s).`
      : "⚠️  payment_received: no row matched the original seed body — left as is.",
  );

  // 3. payment_received subject (email only).
  const ps = await sql`
    UPDATE message_templates SET subject = ${NEW_PAYMENT_SUBJECT}
    WHERE event = 'payment_received' AND subject = ${OLD_PAYMENT_SUBJECT}
    RETURNING id`;
  console.log(
    ps.length
      ? `✅ payment_received: updated ${ps.length} subject row(s).`
      : "⚠️  payment_received: subject already migrated or hand-edited — left as is.",
  );

  // 4. payment_refunded — insert email + sms rows if the event has none yet.
  const existing = await sql`
    SELECT 1 FROM message_templates WHERE event = 'payment_refunded' LIMIT 1`;
  if (existing.length) {
    console.log("⚠️  payment_refunded: templates already exist — not inserting.");
  } else {
    await sql`
      INSERT INTO message_templates (event, channel, subject, body, active)
      VALUES ('payment_refunded', 'email', ${REFUND_SUBJECT}, ${REFUND_BODY}, true)`;
    await sql`
      INSERT INTO message_templates (event, channel, subject, body, active)
      VALUES ('payment_refunded', 'sms', NULL, ${REFUND_BODY}, true)`;
    console.log("✅ payment_refunded: inserted email + sms templates.");
  }

  console.log("\nDone.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Template migration failed:", err?.message || err);
    process.exit(1);
  });
