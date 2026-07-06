"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { researchItems } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

async function guard() {
  const s = await requireAdmin();
  if (!s.authed) throw new Error("Unauthorized");
}

export async function upsertResearch(prevState, fd) {
  await guard();
  const id = fd.get("id") ? Number(fd.get("id")) : null;
  const values = {
    title: String(fd.get("title") || "Untitled"),
    titleHi: fd.get("titleHi") ? String(fd.get("titleHi")) : null,
    summary: fd.get("summary") ? String(fd.get("summary")) : null,
    summaryHi: fd.get("summaryHi") ? String(fd.get("summaryHi")) : null,
    type: String(fd.get("type") || "article"),
    linkOrFile: String(fd.get("linkOrFile") || "#"),
    coverImage: fd.get("coverImage") ? String(fd.get("coverImage")) : null,
    visible: Boolean(fd.get("visible")),
    sortOrder: fd.get("sortOrder") ? Number(fd.get("sortOrder")) : 0,
    publishedAt: new Date(),
  };
  if (id) await db.update(researchItems).set(values).where(eq(researchItems.id, id));
  else await db.insert(researchItems).values(values);
  revalidatePath("/");
  revalidatePath("/admin/research");
  return { ok: true };
}

export async function deleteResearch(id) {
  await guard();
  await db.delete(researchItems).where(eq(researchItems.id, Number(id)));
  revalidatePath("/");
  revalidatePath("/admin/research");
}
