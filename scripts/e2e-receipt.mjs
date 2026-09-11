/**
 * Payment receipts — one per consultation payment, one per medicine payment.
 *
 * Checks eligibility (nothing before payment, nothing once refunded), that
 * confirmation stamps the payment date, the signed-link gate (a tampered
 * signature, another id or the other kind is a 404), what each receipt
 * prints, the dispatch line flipping once the doctor ships, the admin receipt
 * note, and that the patient dashboard links to both receipts.
 *
 *   npm run start   # server must be running (same .env, same AUTH_SECRET)
 *   node --env-file=.env scripts/e2e-receipt.mjs
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
register("./scripts/alias-loader.mjs", pathToFileURL("./").href);

const { eq } = await import("drizzle-orm");
const { db } = await import("@/db");
const { appointments, medicationOrders, patients, services } = await import("@/db/schema");
const { confirmPaidAppointment } = await import("@/lib/booking");
const { receiptPath, receiptNumber } = await import("@/lib/receipts");
const { getSettings, setSetting } = await import("@/lib/settings");

const BASE = process.env.SITE_URL || "http://localhost:3000";
const PHONE = "9000055555";
let pass = true;
const log = (ok, m) => { if (!ok) pass = false; console.log(`${ok ? "✓" : "✗"} ${m}`); };
const get = async (path) => {
  const res = await fetch(BASE + path);
  const html = (await res.text()).replace(/<!-- -->/g, "");
  return { status: res.status, html };
};

// Leftovers from an interrupted earlier run.
for (const p of await db.select({ id: patients.id }).from(patients).where(eq(patients.phone, PHONE))) {
  await db.delete(medicationOrders).where(eq(medicationOrders.patientId, p.id));
}
await db.delete(appointments).where(eq(appointments.patientPhone, PHONE));
await db.delete(patients).where(eq(patients.phone, PHONE));

const [svc] = await db.select().from(services).where(eq(services.active, true)).limit(1);
const { receipt_note: prevNote } = await getSettings(["receipt_note"]);

const [patient] = await db.insert(patients).values({
  name: "Receipt E2E", nameKey: "receipt e2e", phone: PHONE, address: "12 Test Lane, Pune 411001",
}).returning();

// Far-future slot so it can never collide with real bookings.
const startAt = new Date("2031-03-03T05:30:00.000Z");
const [appt] = await db.insert(appointments).values({
  patientName: "Receipt E2E", patientPhone: PHONE, patientId: patient.id,
  serviceId: svc.id, mode: "online", startAt,
  endAt: new Date(startAt.getTime() + svc.durationMinutes * 60000),
  status: "pending_payment", amountInr: svc.feeInr, manageToken: randomUUID(),
}).returning();

const [order] = await db.insert(medicationOrders).values({
  patientId: patient.id, title: "Constitutional remedy — E2E",
  options: [{ days: 30, amountInr: 750 }], chosenDurationDays: 30, amountInr: 750,
  status: "pending_payment", address: "12 Test Lane, Pune 411001",
}).returning();

try {
  // --- consultation ---
  const cPath = receiptPath("consultation", appt.id);
  log((await get(cPath)).status === 404, `no receipt while the booking is unpaid`);

  const res = await confirmPaidAppointment(appt.id, { paymentId: "pay_E2ERECEIPT" });
  log(res.ok && res.appointment.paidAt, `confirming the booking stamps paid_at`);

  const c = await get(cPath);
  log(c.status === 200, `consultation receipt opens once paid (${c.status})`);
  log(c.html.includes(receiptNumber("consultation", appt.id)), `shows receipt no. ${receiptNumber("consultation", appt.id)}`);
  log(c.html.includes(`₹${svc.feeInr}`), `shows the amount ₹${svc.feeInr}`);
  log(c.html.includes("pay_E2ERECEIPT"), `shows the Razorpay payment id`);
  log(c.html.includes("Receipt E2E"), `shows the patient name`);
  log(c.html.includes(svc.title), `shows the service`);
  log(!c.html.includes(patient.dashboardToken), `does not contain the patient's dashboard token`);

  const sig = cPath.split("/").pop();
  const tampered = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
  log((await get(`/receipt/consultation/${appt.id}/${tampered}`)).status === 404, `a tampered signature is refused`);
  log((await get(`/receipt/consultation/${appt.id + 1}/${sig}`)).status === 404, `the signature does not open another id`);
  log((await get(`/receipt/medicine/${appt.id}/${sig}`)).status === 404, `the signature does not open the other kind`);

  // --- medicine ---
  const mPath = receiptPath("medicine", order.id);
  log((await get(mPath)).status === 404, `no medicine receipt while unpaid`);
  await db.update(medicationOrders)
    .set({ status: "paid", paidAt: new Date(), razorpayPaymentId: "pay_E2EMEDS" })
    .where(eq(medicationOrders.id, order.id));
  const m = await get(mPath);
  log(m.status === 200, `medicine receipt opens once paid (${m.status})`);
  log(m.html.includes(receiptNumber("medicine", order.id)) && m.html.includes("₹750"), `shows its own receipt no. and ₹750`);
  log(m.html.includes("Constitutional remedy") && m.html.includes("1 month"), `shows the medicines and the supply`);
  log(m.html.includes("12 Test Lane, Pune 411001"), `shows the ship-to address`);
  log(m.html.includes("To be dispatched by the clinic"), `says it is still to be dispatched`);

  await db.update(medicationOrders)
    .set({ status: "shipped", shippedAt: new Date(), courierRef: "DTDC-E2E-42" })
    .where(eq(medicationOrders.id, order.id));
  const m2 = await get(mPath);
  log(m2.html.includes("Dispatched by the clinic on") && m2.html.includes("DTDC-E2E-42"), `after shipping: dispatch date and courier reference`);

  // --- admin note ---
  await setSetting("receipt_note", "E2E note: printed on every receipt.");
  log((await get(cPath)).html.includes("E2E note: printed on every receipt."), `the admin receipt note is printed`);

  // --- dashboard links ---
  const dash = await get(`/patient/${patient.dashboardToken}`);
  log(dash.html.includes(cPath) && dash.html.includes(mPath), `the patient dashboard links to both receipts`);

  // --- refunded payments lose their receipt ---
  await db.update(appointments).set({ razorpayRefundId: "rfnd_E2E" }).where(eq(appointments.id, appt.id));
  log((await get(cPath)).status === 404, `a refunded consultation has no receipt`);
} finally {
  await setSetting("receipt_note", prevNote ?? "");
  await db.delete(medicationOrders).where(eq(medicationOrders.patientId, patient.id));
  await db.delete(appointments).where(eq(appointments.patientPhone, PHONE));
  await db.delete(patients).where(eq(patients.phone, PHONE));
  console.log("\ncleanup: test patient, booking, order and receipt note restored");
}

process.exitCode = pass ? 0 : 1;
