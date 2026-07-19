"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gt, gte, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { appointments, filledSlots } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminDaySlots } from "@/lib/booking";
import { nowUtc } from "@/lib/time";

async function guard() {
  const s = await requireAdmin();
  if (!s.authed) throw new Error("Unauthorized");
}

/** One IST day's slot grid for the "Filled slots" manager, each slot tagged
 * open / booked (real appointment) / filled (admin-marked). */
export async function getScarcityDay(serviceId, mode, dateStr) {
  await guard();
  if (!serviceId || !dateStr) return { service: null, slots: [] };
  const { service, mode: resolvedMode, slots } = await getAdminDaySlots({
    serviceId: Number(serviceId),
    mode: mode || undefined,
    dateStr: String(dateStr),
  });
  return {
    service: service ? { id: service.id, title: service.title } : null,
    mode: resolvedMode,
    slots,
  };
}

/**
 * Toggle an admin "display as booked" mark for the exact [startAt, endAt) range:
 * delete the filled_slots row if one exists, else create it. Refuses to mark a
 * slot that overlaps a real active (pending_payment/confirmed) appointment — a
 * genuinely booked slot is not toggleable. Returns { ok, filled }.
 */
export async function toggleFilledSlot(startAtIso, endAtIso) {
  await guard();
  const startAt = new Date(startAtIso);
  const endAt = new Date(endAtIso);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return { ok: false, reason: "bad_time" };
  }

  const [existing] = await db
    .select({ id: filledSlots.id })
    .from(filledSlots)
    .where(and(eq(filledSlots.startAt, startAt), eq(filledSlots.endAt, endAt)))
    .limit(1);

  if (existing) {
    await db.delete(filledSlots).where(eq(filledSlots.id, existing.id));
    revalidatePath("/admin/availability");
    return { ok: true, filled: false };
  }

  // A genuinely booked slot can't be marked (nothing to fake — it's real).
  const [clash] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        lt(appointments.startAt, endAt),
        gt(appointments.endAt, startAt),
        or(
          eq(appointments.status, "confirmed"),
          and(
            eq(appointments.status, "pending_payment"),
            gte(appointments.holdExpiresAt, nowUtc()),
          ),
        ),
      ),
    )
    .limit(1);
  if (clash) return { ok: false, reason: "booked" };

  await db.insert(filledSlots).values({ startAt, endAt });
  revalidatePath("/admin/availability");
  return { ok: true, filled: true };
}
