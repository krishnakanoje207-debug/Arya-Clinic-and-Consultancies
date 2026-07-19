import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { IST_ZONE, istToday, nowUtc } from "@/lib/time";
import { dispatchMedicationReminder, dispatchNotification } from "@/lib/notify";
import { getMedicationReminders, markRefillReminderSent } from "@/lib/medications";
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

  // Medication reminders: a daily "take your medicine" nudge while the supply
  // is active, plus a one-time refill prompt ~3 days before it runs out. Dose
  // reminders carry no flag — the once-a-day cron cadence is the dedup, and a
  // duplicate over a missed day is accepted project-wide. Refill prompts are
  // send-then-mark, same policy as the appointment reminders above.
  const now = nowUtc();
  const { doseOrders, refillOrders } = await getMedicationReminders(now);

  for (const { order, patient } of doseOrders) {
    await dispatchMedicationReminder("medication_dose", order, patient);
  }
  for (const { order, patient } of refillOrders) {
    await dispatchMedicationReminder("medication_refill", order, patient);
    await markRefillReminderSent(order.id);
  }

  return Response.json({
    ok: true,
    reminded: due.length,
    doseReminders: doseOrders.length,
    refillReminders: refillOrders.length,
  });
}
