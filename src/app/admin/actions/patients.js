"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

async function guard() {
  const s = await requireAdmin();
  if (!s.authed) throw new Error("Unauthorized");
}

/** Issue a fresh dashboard link for a patient (invalidates the old one —
 * e.g. if it was shared by mistake). */
export async function regeneratePatientLink(id) {
  await guard();
  await db
    .update(patients)
    .set({ dashboardToken: randomUUID(), updatedAt: new Date() })
    .where(eq(patients.id, Number(id)));
  revalidatePath("/admin/patients");
}
