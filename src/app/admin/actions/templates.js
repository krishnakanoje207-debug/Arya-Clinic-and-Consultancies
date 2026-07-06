"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { messageTemplates } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

async function guard() {
  const s = await requireAdmin();
  if (!s.authed) throw new Error("Unauthorized");
}

export async function upsertTemplate(prevState, fd) {
  await guard();
  const id = fd.get("id") ? Number(fd.get("id")) : null;
  const values = {
    event: String(fd.get("event") || "booking_received"),
    channel: String(fd.get("channel") || "email"),
    subject: fd.get("subject") ? String(fd.get("subject")) : null,
    body: String(fd.get("body") || ""),
    bodyHi: fd.get("bodyHi") ? String(fd.get("bodyHi")) : null,
    active: Boolean(fd.get("active")),
  };
  if (!values.body.trim()) return { ok: false, error: "Body is required." };
  if (id) await db.update(messageTemplates).set(values).where(eq(messageTemplates.id, id));
  else await db.insert(messageTemplates).values(values);
  revalidatePath("/admin/templates");
  return { ok: true };
}

export async function deleteTemplate(id) {
  await guard();
  await db.delete(messageTemplates).where(eq(messageTemplates.id, Number(id)));
  revalidatePath("/admin/templates");
}
