import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { tokenSchema } from "@/lib/validation";

/**
 * Post-payment status check. BookingFlow polls this every few seconds while
 * Checkout is open and after it closes, until the webhook has confirmed the
 * booking, then sends the patient to their dashboard.
 *
 * A route handler rather than a server action on purpose: server actions POST
 * to /book, which the proxy rate-limits to 20 requests per 5 minutes per IP.
 * Polling from there used up that budget in about a minute; the checks then
 * came back 429 and the redirect never happened (and the page could not even
 * reload its calendar). This path carries no rate-limit rule.
 *
 * Scoped by the booking's manage token (a UUID only the booker holds), sent in
 * the body so it stays out of URLs and access logs. Returns status only.
 */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const token = tokenSchema.safeParse(body?.token);
  if (!token.success) return Response.json({ ok: false }, { status: 400 });

  const [appt] = await db
    .select({ status: appointments.status })
    .from(appointments)
    .where(eq(appointments.manageToken, token.data));
  if (!appt) return Response.json({ ok: false }, { status: 404 });

  return Response.json(
    { ok: true, status: appt.status, confirmed: appt.status === "confirmed" },
    { headers: { "cache-control": "no-store" } },
  );
}
