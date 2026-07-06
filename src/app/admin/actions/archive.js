"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getArchivableRows, runArchival } from "@/lib/archive";

/** Count what an archival run would export (no changes made). */
export async function previewArchival() {
  const s = await requireAdmin();
  if (!s.authed) return { ok: false, error: "Unauthorized" };
  try {
    const rows = await getArchivableRows();
    return { ok: true, eligible: rows.length };
  } catch (err) {
    return { ok: false, error: err?.message || "Query failed" };
  }
}

/** Run the archival: deliver → summaries → delete (see src/lib/archive.js). */
export async function runArchivalAction() {
  const s = await requireAdmin();
  if (!s.authed) return { ok: false, error: "Unauthorized" };
  try {
    const result = await runArchival();
    revalidatePath("/admin");
    return result;
  } catch (err) {
    // A throw here means delivery failed — nothing was deleted.
    return { ok: false, error: err?.message || "Archival failed before delivery — no data was removed." };
  }
}
