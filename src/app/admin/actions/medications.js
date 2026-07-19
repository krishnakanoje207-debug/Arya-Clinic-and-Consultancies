"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { medicationOrders } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

async function guard() {
  const s = await requireAdmin();
  if (!s.authed) throw new Error("Unauthorized");
}

const durationDays = z.coerce
  .number()
  .int()
  .refine((d) => d === 15 || d === 30 || d === 60, "invalid duration");

const createOrderSchema = z.object({
  patientId: z.coerce.number().int().positive(),
  appointmentId: z.coerce.number().int().positive().nullish(),
  title: z.string().trim().min(1).max(300),
  options: z
    .array(
      z.object({
        days: durationDays,
        amountInr: z.coerce.number().int().positive(),
      }),
    )
    .min(1),
});

/** Create a medication order for a patient: the doctor names the medicines and
 * prices each duration she medically allows (options). It starts
 * pending_payment; the patient picks a duration and pays from their dashboard. */
export async function createMedicationOrder(input) {
  await guard();
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { patientId, appointmentId, title, options } = parsed.data;
  const [order] = await db
    .insert(medicationOrders)
    .values({
      patientId,
      appointmentId: appointmentId ?? null,
      title,
      options,
    })
    .returning();
  revalidatePath("/admin/medications");
  return { ok: true, order };
}

/** Mark the order shipped with an optional courier reference (only from paid). */
export async function markMedicationShipped(orderId, courierRef) {
  await guard();
  const ref = z.string().trim().max(200).nullish().safeParse(courierRef);
  if (!ref.success) return { ok: false, reason: "invalid" };
  const now = new Date();
  const [row] = await db
    .update(medicationOrders)
    .set({
      status: "shipped",
      shippedAt: now,
      courierRef: ref.data || null,
      updatedAt: now,
    })
    .where(
      and(
        eq(medicationOrders.id, Number(orderId)),
        eq(medicationOrders.status, "paid"),
      ),
    )
    .returning();
  if (!row) return { ok: false, reason: "bad_state" };
  revalidatePath("/admin/medications");
  return { ok: true };
}

/** Cancel an order (anything except an already-shipped parcel). */
export async function cancelMedicationOrder(orderId) {
  await guard();
  const [row] = await db
    .update(medicationOrders)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(medicationOrders.id, Number(orderId)),
        ne(medicationOrders.status, "shipped"),
      ),
    )
    .returning();
  if (!row) return { ok: false, reason: "bad_state" };
  revalidatePath("/admin/medications");
  return { ok: true };
}
