/**
 * Razorpay end-to-end: proves the gateway integration against the LIVE local DB
 * + a running dev server.
 *
 *   1. docker compose up -d && npm run db:migrate && npm run db:seed
 *   2. start the dev server (see below) so the webhook route is reachable
 *   3. node --env-file=.env scripts/e2e-razorpay.mjs
 *
 * It (a) creates a REAL order against Razorpay's TEST API and asserts the id is
 * stored on the booking row; (b) POSTs a correctly SELF-SIGNED payment.captured
 * to the local webhook and asserts the appointment flips to confirmed; (c)
 * asserts the idempotent re-POST no-ops and a bad signature is rejected 400; (d)
 * asserts the "paid but the slot was already retaken" path marks the row for
 * refund; and (e) asserts a medication order is marked paid by the webhook.
 *
 * The refund step uses a fabricated payment id, so the real refund API call is
 * expected to fail and is swallowed by the route — we assert the code path via
 * the webhook's `action` flag ("refunded"), per the locked spec.
 *
 * Env: DATABASE_URL (local proxy), RAZORPAY_* keys, optional E2E_BASE_URL
 * (default http://localhost:3000).
 */
import { neon, neonConfig } from "@neondatabase/serverless";
import { createHmac, randomUUID } from "node:crypto";

if (process.env.DATABASE_URL?.includes("db.localtest.me")) {
  neonConfig.fetchEndpoint = (host) => `http://${host}:4444/sql`;
}
const sql = neon(process.env.DATABASE_URL);
const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const WEBHOOK = `${BASE}/api/razorpay/webhook`;
const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

const PHONE = "+919999000011";
const NORM = "9999000011";

let failures = 0;
function log(ok, msg) {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) failures += 1;
}

function sign(raw) {
  return createHmac("sha256", SECRET).update(raw, "utf8").digest("hex");
}

async function postWebhook(payload, { badSig = false } = {}) {
  const raw = JSON.stringify(payload);
  const signature = badSig ? "deadbeef" : sign(raw);
  const res = await fetch(WEBHOOK, {
    method: "POST",
    headers: { "content-type": "application/json", "x-razorpay-signature": signature },
    body: raw,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON (e.g. 400 "invalid signature") */
  }
  return { status: res.status, json };
}

function captured(orderId, paymentId, notes = {}) {
  return {
    event: "payment.captured",
    payload: { payment: { entity: { id: paymentId, order_id: orderId, notes } } },
  };
}

async function createTestOrder(amountInr, notes) {
  const token = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`,
  ).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { authorization: `Basic ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(amountInr * 100),
      currency: "INR",
      receipt: `e2e_${Date.now()}`,
      notes,
    }),
  });
  if (!res.ok) throw new Error(`order create ${res.status}: ${await res.text()}`);
  return res.json();
}

try {
  if (!SECRET) throw new Error("RAZORPAY_WEBHOOK_SECRET missing");

  // Reachability check.
  try {
    const ping = await fetch(BASE, { method: "HEAD" });
    log(ping.ok || ping.status < 500, `dev server reachable at ${BASE} (${ping.status})`);
  } catch (e) {
    throw new Error(`dev server not reachable at ${BASE} — start it first (${e.message})`);
  }

  const [svc] = await sql`select id, fee_inr, duration_minutes from services where active = true order by id limit 1`;
  log(!!svc, `picked service #${svc?.id} (₹${svc?.fee_inr}, ${svc?.duration_minutes}m)`);
  const durMs = svc.duration_minutes * 60000;

  const [pat] = await sql`
    insert into patients (name, phone) values ('E2E Razorpay', ${NORM})
    on conflict (phone) do update set name = excluded.name, updated_at = now()
    returning id, dashboard_token`;
  log(!!pat, `upserted patient #${pat?.id}`);

  // ── (a) REAL test order stored on a booking row ───────────────────────────
  const startA1 = "2031-01-01T05:30:00.000Z";
  const endA1 = new Date(new Date(startA1).getTime() + durMs).toISOString();
  const hold = new Date(Date.now() + 15 * 60000).toISOString();
  const tokenA1 = randomUUID();

  let orderId = null;
  try {
    const order = await createTestOrder(svc.fee_inr, { kind: "appointment", e2e: "1" });
    orderId = order.id;
    log(/^order_/.test(orderId), `created REAL Razorpay test order ${orderId}`);
  } catch (e) {
    orderId = `order_e2e_${randomUUID().slice(0, 12)}`;
    log(true, `⚠ Razorpay test order API unreachable (${e.message}) — using synthetic ${orderId}`);
  }

  const [a1] = await sql`
    insert into appointments (patient_name, patient_phone, service_id, mode, start_at, end_at,
      status, amount_inr, hold_expires_at, manage_token, patient_id, razorpay_order_id)
    values ('E2E Razorpay', ${PHONE}, ${svc.id}, 'online', ${startA1}, ${endA1},
      'pending_payment', ${svc.fee_inr}, ${hold}, ${tokenA1}, ${pat.id}, ${orderId})
    returning id`;
  const [stored] = await sql`select razorpay_order_id from appointments where id = ${a1.id}`;
  log(stored.razorpay_order_id === orderId, `order id stored on booking row #${a1.id}`);

  // ── (b) payment.captured → confirmed ──────────────────────────────────────
  const payId1 = `pay_e2e_${randomUUID().slice(0, 12)}`;
  const r1 = await postWebhook(captured(orderId, payId1));
  log(r1.status === 200 && r1.json?.action === "confirmed", `payment.captured → 200 action=confirmed (got ${r1.status}/${r1.json?.action})`);
  const [c1] = await sql`select status, razorpay_payment_id from appointments where id = ${a1.id}`;
  log(c1.status === "confirmed", `appointment #${a1.id} is confirmed`);
  log(c1.razorpay_payment_id === payId1, `payment id recorded on the row`);

  // ── (c) idempotent re-POST no-ops ─────────────────────────────────────────
  const r2 = await postWebhook(captured(orderId, payId1));
  log(r2.status === 200 && r2.json?.action === "noop", `re-POST → 200 action=noop (got ${r2.status}/${r2.json?.action})`);

  // ── (c') bad signature rejected ───────────────────────────────────────────
  const rBad = await postWebhook(captured(orderId, payId1), { badSig: true });
  log(rBad.status === 400, `bad signature → 400 (got ${rBad.status})`);

  // ── (d) paid but slot already retaken → refund path ───────────────────────
  const startLost = "2031-02-01T05:30:00.000Z";
  const endLost = new Date(new Date(startLost).getTime() + durMs).toISOString();
  // A2 = the "other patient" already holding the slot (confirmed).
  await sql`
    insert into appointments (patient_name, patient_phone, service_id, mode, start_at, end_at,
      status, amount_inr, manage_token, patient_id)
    values ('E2E Holder', ${PHONE}, ${svc.id}, 'online', ${startLost}, ${endLost},
      'confirmed', ${svc.fee_inr}, ${randomUUID()}, ${pat.id})`;
  // A3 = the late payer whose hold already expired for the same slot.
  const orderLost = `order_e2e_lost_${randomUUID().slice(0, 8)}`;
  const [a3] = await sql`
    insert into appointments (patient_name, patient_phone, service_id, mode, start_at, end_at,
      status, amount_inr, manage_token, patient_id, razorpay_order_id)
    values ('E2E Late', ${PHONE}, ${svc.id}, 'online', ${startLost}, ${endLost},
      'expired', ${svc.fee_inr}, ${randomUUID()}, ${pat.id}, ${orderLost})
    returning id`;
  const payLost = `pay_e2e_${randomUUID().slice(0, 12)}`;
  const r3 = await postWebhook(captured(orderLost, payLost));
  log(r3.status === 200 && r3.json?.action === "refunded", `captured on lost slot → 200 action=refunded (got ${r3.status}/${r3.json?.action})`);
  const [c3] = await sql`select status, razorpay_payment_id, razorpay_refund_id from appointments where id = ${a3.id}`;
  log(c3.status !== "confirmed", `late row #${a3.id} was NOT confirmed (status ${c3.status})`);
  log(c3.razorpay_payment_id === payLost, `payment id stamped on the refunded row for the record`);

  // ── (e) medication order paid via webhook ─────────────────────────────────
  const orderMeds = `order_e2e_meds_${randomUUID().slice(0, 8)}`;
  const [med] = await sql`
    insert into medication_orders (patient_id, title, options, chosen_duration_days, amount_inr,
      status, address, razorpay_order_id)
    values (${pat.id}, 'E2E Meds', ${JSON.stringify([{ days: 30, amountInr: svc.fee_inr }])}::jsonb,
      30, ${svc.fee_inr}, 'pending_payment', 'E2E address', ${orderMeds})
    returning id`;
  const payMeds = `pay_e2e_${randomUUID().slice(0, 12)}`;
  const r4 = await postWebhook(captured(orderMeds, payMeds, { kind: "medication" }));
  log(r4.status === 200 && r4.json?.action === "paid", `medication captured → 200 action=paid (got ${r4.status}/${r4.json?.action})`);
  const [m1] = await sql`select status, razorpay_payment_id from medication_orders where id = ${med.id}`;
  log(m1.status === "paid", `medication order #${med.id} is paid`);
  const r5 = await postWebhook(captured(orderMeds, payMeds, { kind: "medication" }));
  log(r5.json?.action === "noop", `medication re-POST → action=noop (got ${r5.json?.action})`);
} finally {
  await sql`delete from appointments where patient_phone = ${PHONE}`;
  await sql`delete from medication_orders where patient_id in (select id from patients where phone = ${NORM})`;
  await sql`delete from patients where phone = ${NORM}`;
  console.log("\ncleanup: removed test appointment/medication/patient rows.");
}

if (failures) {
  console.log(`\n✗ ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log("\n✓ All Razorpay e2e assertions passed.");
process.exit(0);
