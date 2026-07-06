import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, services } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { formatIst } from "@/lib/time";

/** CSV export of all appointments (Admin ▸ Appointments ▸ Export).
 * Route handlers bypass the panel layout, so auth is checked here. */
function csvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session.authed) return new Response("Unauthorized", { status: 401 });

  const rows = await db
    .select({ a: appointments, serviceTitle: services.title })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .orderBy(desc(appointments.startAt));

  const header = [
    "id", "status", "patient_name", "phone", "email", "service", "mode",
    "start_ist", "amount_inr", "utr", "needs_review", "created_ist",
  ];
  const lines = [header.join(",")];
  for (const { a, serviceTitle } of rows) {
    lines.push(
      [
        a.id,
        a.status,
        a.patientName,
        a.patientPhone,
        a.patientEmail,
        serviceTitle,
        a.mode,
        formatIst(a.startAt),
        a.amountInr,
        a.utr,
        a.needsReview ? "yes" : "no",
        formatIst(a.createdAt),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  // Excel opens UTF-8 correctly with a BOM. NOTE: the string below starts
  // with a LITERAL U+FEFF (invisible!) — verified bytes EF BB BF. Don't
  // "clean up" the empty-looking quotes.
  const body = "﻿" + lines.join("\r\n");

  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="appointments.csv"`,
    },
  });
}
