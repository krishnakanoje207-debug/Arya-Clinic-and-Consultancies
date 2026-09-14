import { DateTime } from "luxon";
import { IST_ZONE } from "@/lib/time";
import { sendDoctorDigest } from "@/lib/doctor-digest";

/**
 * The doctor's morning and evening digest (src/lib/doctor-digest.js). One
 * route, two schedules in vercel.json; Vercel names the one that fired in the
 * x-vercel-cron-schedule header. These strings must match vercel.json.
 * Protected by CRON_SECRET like the patient reminders. ?slot=morning|evening
 * overrides, for a manual run.
 */
const MORNING = "30 2 * * *"; // 08:00 IST (Hobby fires somewhere in that hour)
const EVENING = "30 14 * * *"; // 20:00 IST

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  // Fail closed: an unset secret must not leave the route open to anyone.
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const asked = new URL(request.url).searchParams.get("slot");
  const fired = request.headers.get("x-vercel-cron-schedule");
  const slot =
    asked === "morning" || asked === "evening"
      ? asked
      : fired === EVENING
        ? "evening"
        : fired === MORNING
          ? "morning"
          : DateTime.now().setZone(IST_ZONE).hour < 14
            ? "morning"
            : "evening";

  const result = await sendDoctorDigest({ slot });
  return Response.json({
    ok: true,
    slot,
    sent: result.sent,
    reason: result.reason,
    counts: result.counts,
    calendar: result.calendar?.ok ? "ok" : result.calendar?.reason || result.calendar?.error,
  });
}
