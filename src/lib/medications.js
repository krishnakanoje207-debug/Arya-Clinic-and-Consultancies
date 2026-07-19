import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { medicationOrders, patients } from "@/db/schema";
import { nowUtc } from "@/lib/time";
import { medicationPaymentSchema } from "@/lib/validation";

const DAY_MS = 24 * 60 * 60 * 1000;

/** A medication order's supply start instant: the ship date if it has shipped,
 * otherwise the paid date. Null until the doctor marks it paid. */
function supplyStart(order) {
  const start = order.shippedAt || order.paidAt;
  return start ? new Date(start) : null;
}

/** All medication orders for a patient, newest first. */
export async function listOrdersForPatient(patientId) {
  return db
    .select()
    .from(medicationOrders)
    .where(eq(medicationOrders.patientId, Number(patientId)))
    .orderBy(desc(medicationOrders.createdAt));
}

/**
 * Patient pays for a medication order (mirrors the consultation UTR flow).
 * Validates the payload, resolves the patient by their private dashboard
 * token, then the order — which must belong to that patient and still be
 * awaiting payment. The chosen duration must be one the doctor enabled; its
 * price becomes the order amount. Also persists the shipping address onto the
 * patient row so it prefills next time. Returns {ok:false, reason} for every
 * rejection so the action layer can surface a specific message.
 */
export async function submitMedicationPayment(dashboardToken, payload) {
  const parsed = medicationPaymentSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { orderId, durationDays, address, utr } = parsed.data;

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.dashboardToken, dashboardToken));
  if (!patient) return { ok: false, reason: "not_found" };

  const [order] = await db
    .select()
    .from(medicationOrders)
    .where(eq(medicationOrders.id, orderId));
  if (!order || order.patientId !== patient.id) {
    return { ok: false, reason: "not_found" };
  }
  if (order.status !== "pending_payment") {
    return { ok: false, reason: "already_paid" };
  }

  const options = Array.isArray(order.options) ? order.options : [];
  const match = options.find((o) => Number(o.days) === durationDays);
  if (!match) return { ok: false, reason: "bad_duration" };

  const now = nowUtc();
  const [updated] = await db
    .update(medicationOrders)
    .set({
      chosenDurationDays: durationDays,
      amountInr: Number(match.amountInr),
      address,
      utr,
      utrSubmittedAt: now,
      updatedAt: now,
    })
    .where(eq(medicationOrders.id, order.id))
    .returning();

  await db
    .update(patients)
    .set({ address, updatedAt: now })
    .where(eq(patients.id, patient.id));

  return { ok: true, order: updated };
}

/**
 * Orders due for reminders at instant `now` (called by the daily cron).
 * Considers only paid/shipped orders. dose: the supply window
 * [start, start+chosenDurationDays] currently covers now. refill: ≤3 days of
 * supply remain and the one-time refill prompt hasn't been sent yet. Each
 * entry carries its joined patient (name/phone/email/dashboardToken) so the
 * dispatcher can message them without a second query.
 */
export async function getMedicationReminders(now = nowUtc()) {
  const at = now instanceof Date ? now : new Date(now);
  const rows = await db
    .select({ order: medicationOrders, patient: patients })
    .from(medicationOrders)
    .innerJoin(patients, eq(medicationOrders.patientId, patients.id))
    .where(inArray(medicationOrders.status, ["paid", "shipped"]));

  const doseOrders = [];
  const refillOrders = [];
  for (const { order, patient } of rows) {
    const start = supplyStart(order);
    if (!start || !order.chosenDurationDays) continue;
    const end = new Date(start.getTime() + order.chosenDurationDays * DAY_MS);
    if (at >= start && at <= end) doseOrders.push({ order, patient });
    const daysLeft = Math.ceil((end.getTime() - at.getTime()) / DAY_MS);
    if (daysLeft <= 3 && !order.refillReminderSent) {
      refillOrders.push({ order, patient });
    }
  }
  return { doseOrders, refillOrders };
}

/** Days of supply remaining for an order at `now` (rounded up). Used by the
 * notification values builder for the {days_left} placeholder. */
export function daysLeftForOrder(order, now = nowUtc()) {
  const start = supplyStart(order);
  if (!start || !order.chosenDurationDays) return null;
  const at = now instanceof Date ? now : new Date(now);
  const end = new Date(start.getTime() + order.chosenDurationDays * DAY_MS);
  return Math.ceil((end.getTime() - at.getTime()) / DAY_MS);
}

/** Mark the one-time refill prompt as sent (send-then-mark, so a crash between
 * the two only risks a duplicate — never a silently missed reminder). */
export async function markRefillReminderSent(orderId) {
  await db
    .update(medicationOrders)
    .set({ refillReminderSent: true, updatedAt: nowUtc() })
    .where(eq(medicationOrders.id, Number(orderId)));
}
