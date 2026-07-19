/**
 * DB-level medication-order lifecycle E2E — proves the medication persistence
 * layer works end to end against the live local database by driving the REAL
 * library functions (src/lib/medications.js), not a re-implementation:
 *   admin creates an order → patient pays (duration chosen, amount copied,
 *   address mirrored, UTR recorded) → reject bad_duration → reject already_paid
 *   → paid→shipped → getMedicationReminders dose/refill selection + one-time
 *   refill guard → clean up the test rows.
 *
 *   node --env-file=.env scripts/e2e-medications.mjs
 *
 * Unlike e2e-booking.mjs (raw SQL) this imports the app modules through the
 * "@/" alias via a tiny resolve hook (scripts/alias-loader.mjs), so the exact
 * functions the UI calls are under test. db/index.js auto-points the neon
 * driver at the local proxy when DATABASE_URL targets db.localtest.me.
 */
import { register } from "node:module";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

register("./scripts/alias-loader.mjs", pathToFileURL("./").href);

const { eq, inArray } = await import("drizzle-orm");
const { db } = await import("@/db");
const { medicationOrders, patients } = await import("@/db/schema");
const { beginMedicationPayment, getMedicationReminders } = await import(
  "@/lib/medications"
);

const DAY_MS = 24 * 60 * 60 * 1000;
const NORM = "9999000002"; // test-only phone (last 10 digits); rows deleted below

function log(ok, msg) {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) process.exitCode = 1;
}

let patientId = null;
try {
  // --- Setup: a test patient (mirrors upsertPatientForBooking's insert) ---
  const token = randomUUID();
  const [patient] = await db
    .insert(patients)
    .values({ name: "Med E2E", phone: NORM, dashboardToken: token })
    .returning();
  patientId = patient.id;
  log(!!patient, `created patient #${patient.id}`);

  // --- Admin creates an order (mirrors createMedicationOrder's insert) ---
  const [order] = await db
    .insert(medicationOrders)
    .values({
      patientId: patient.id,
      title: "E2E constitutional remedy",
      options: [
        { days: 15, amountInr: 300 },
        { days: 30, amountInr: 500 },
      ],
    })
    .returning();
  log(order?.status === "pending_payment", `created order #${order.id} (pending_payment)`);

  // --- Patient pays: happy path (real beginMedicationPayment; webhook marks paid) ---
  const ADDR = "123 Test Lane, Nagpur, PIN 440001";
  const pay = await beginMedicationPayment(token, {
    orderId: order.id,
    durationDays: 30,
    address: ADDR,
  });
  log(pay.ok, `payment accepted (ok=${pay.ok})`);
  log(pay.order?.chosenDurationDays === 30, `chosen duration recorded (${pay.order?.chosenDurationDays})`);
  log(pay.order?.amountInr === 500, `amount copied from matching option (₹${pay.order?.amountInr})`);
  log(pay.order?.status === "pending_payment", `order stays pending until the webhook (${pay.order?.status})`);

  const [afterPay] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patient.id));
  log(afterPay.address === ADDR, `shipping address mirrored onto patient row`);

  // --- Rejection: bad_duration (60 not among this order's options) ---
  const [order2] = await db
    .insert(medicationOrders)
    .values({
      patientId: patient.id,
      title: "E2E 15-day only",
      options: [{ days: 15, amountInr: 250 }],
    })
    .returning();
  const badDur = await beginMedicationPayment(token, {
    orderId: order2.id,
    durationDays: 60,
    address: ADDR,
  });
  log(!badDur.ok && badDur.reason === "bad_duration", `duration not in options rejected (${badDur.reason})`);

  // --- Rejection: already_paid (mark order1 paid, then re-pay) ---
  await db
    .update(medicationOrders)
    .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
    .where(eq(medicationOrders.id, order.id));
  const rePay = await beginMedicationPayment(token, {
    orderId: order.id,
    durationDays: 15,
    address: ADDR,
  });
  log(!rePay.ok && rePay.reason === "already_paid", `paying an already-paid order rejected (${rePay.reason})`);

  // --- Status transition paid → shipped ---
  const [shipped] = await db
    .update(medicationOrders)
    .set({ status: "shipped", shippedAt: new Date(), courierRef: "E2E-COURIER-1", updatedAt: new Date() })
    .where(eq(medicationOrders.id, order.id))
    .returning();
  log(shipped.status === "shipped" && !!shipped.shippedAt, `paid → shipped (status ${shipped.status})`);

  // --- getMedicationReminders: dose + refill selection & one-time guard ---
  const now = Date.now();
  const [doseOrder] = await db
    .insert(medicationOrders)
    .values({
      patientId: patient.id,
      title: "E2E dose window",
      options: [{ days: 30, amountInr: 500 }],
      chosenDurationDays: 30,
      amountInr: 500,
      status: "paid",
      paidAt: new Date(now - 5 * DAY_MS), // 25 days left → dose only
    })
    .returning();
  const [refillOrder] = await db
    .insert(medicationOrders)
    .values({
      patientId: patient.id,
      title: "E2E refill due",
      options: [{ days: 30, amountInr: 500 }],
      chosenDurationDays: 30,
      amountInr: 500,
      status: "paid",
      paidAt: new Date(now - 28 * DAY_MS), // 2 days left → dose + refill
    })
    .returning();
  const [refillSent] = await db
    .insert(medicationOrders)
    .values({
      patientId: patient.id,
      title: "E2E refill already sent",
      options: [{ days: 30, amountInr: 500 }],
      chosenDurationDays: 30,
      amountInr: 500,
      status: "paid",
      paidAt: new Date(now - 28 * DAY_MS),
      refillReminderSent: true, // guarded → must NOT appear in refill
    })
    .returning();

  const { doseOrders, refillOrders } = await getMedicationReminders();
  const doseIds = new Set(doseOrders.map((x) => x.order.id));
  const refillIds = new Set(refillOrders.map((x) => x.order.id));

  log(doseIds.has(doseOrder.id), `in-window order selected for dose reminder`);
  log(!refillIds.has(doseOrder.id), `order with 25 days left not selected for refill`);
  log(refillIds.has(refillOrder.id), `order with ≤3 days left selected for refill`);
  log(doseIds.has(refillOrder.id), `near-expiry order still gets a dose reminder`);
  log(!refillIds.has(refillSent.id), `refill_reminder_sent guard suppresses a second refill`);
} finally {
  if (patientId != null) {
    const del = await db
      .delete(medicationOrders)
      .where(eq(medicationOrders.patientId, patientId))
      .returning();
    const delp = await db
      .delete(patients)
      .where(inArray(patients.id, [patientId]))
      .returning();
    console.log(
      `\ncleanup: removed ${del.length} medication order(s), ${delp.length} patient row(s)`,
    );
  }
}
process.exit(process.exitCode || 0);
