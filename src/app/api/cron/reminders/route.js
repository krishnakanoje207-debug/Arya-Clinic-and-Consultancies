import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { IST_ZONE, istToday } from "@/lib/time";
import { dispatchNotification } from "@/lib/notify";
import { DateTime } from "luxon";

/**
 * Daily reminder batch. Vercel Hobby crons run at most once per day, so this
 * sends reminders for *tomorrow's* confirmed appointments in one pass
 * (schedule it ~08:00 IST in vercel.json). Protected by CRON_SECRET.
 *
 * The actual email/SMS dispatch is the notification adapter (Fable §5); this
 * route selects the due appointments and marks them reminded.
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const today = istToday();
  const startTomorrow = DateTime.fromISO(today, { zone: IST_ZONE })
    .plus({ days: 1 })
    .toUTC()
    .toJSDate();
  const endTomorrow = DateTime.fromISO(today, { zone: IST_ZONE })
    .plus({ days: 2 })
    .toUTC()
    .toJSDate();

  const due = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.status, "confirmed"),
        eq(appointments.reminderSent, false),
        gte(appointments.startAt, startTomorrow),
        lt(appointments.startAt, endTomorrow),
      ),
    );

  for (const appt of due) {
    // Dispatch first, then mark: a crash between the two means at worst a
    // duplicate reminder tomorrow — never a silently missed one.
    await dispatchNotification("reminder", appt, { includeIcs: true });
    await db
      .update(appointments)
      .set({ reminderSent: true, updatedAt: new Date() })
      .where(eq(appointments.id, appt.id));
  }

  return Response.json({ ok: true, reminded: due.length });
}
