import { requireAdmin } from "@/lib/admin-auth";
import { COMPLETED_HEADERS, completedRowsForExport } from "@/lib/sheets";

/** CSV export of all completed appointments (Admin ▸ Patient management ▸
 * Download Excel). Same columns as the Google Sheet append. Route handlers
 * bypass the panel layout, so auth is checked here. */
function csvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session.authed) return new Response("Unauthorized", { status: 401 });

  const rows = await completedRowsForExport();
  const lines = [COMPLETED_HEADERS.map(csvCell).join(",")];
  for (const cells of rows) {
    lines.push(cells.map(csvCell).join(","));
  }
  // Excel opens UTF-8 correctly with a BOM. NOTE: the string below starts with a
  // LITERAL U+FEFF (invisible!) — verified bytes EF BB BF. Don't "clean up" the
  // empty-looking quotes.
  const body = "﻿" + lines.join("\r\n");

  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="completed-appointments.csv"`,
    },
  });
}
