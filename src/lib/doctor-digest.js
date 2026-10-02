import { createHash } from "crypto";
import { and, asc, eq, gte, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import { DateTime } from "luxon";
import { db } from "@/db";
import {
  appointments,
  contactMessages,
  medicationOrders,
  patients,
  services,
  testimonials,
} from "@/db/schema";
import { IST_ZONE, formatIst, nowUtc } from "@/lib/time";
import { getSettings } from "@/lib/settings";
import { sendEmail } from "@/lib/notify/email";
import { upsertTodoEvent } from "@/lib/gcal";

/**
 * The doctor's own reminders: a morning and an evening digest of everything
 * waiting on HER, emailed to the clinic inbox and dropped into her Google
 * Calendar as a timed to-do entry (so her phone alerts even on days she never
 * opens the admin panel).
 *
 * Every item is derived from current data, never from "was it sent before":
 * it keeps appearing until she deals with it, and disappears on its own once
 * she does. The one exception is contact-form messages, which have no admin
 * page — the email is their delivery, so they are marked read once it goes.
 *
 * Thresholds are deliberately plain constants; see THRESHOLDS.
 */

export const THRESHOLDS = {
  medicineOrderWindowDays: 7, // completed consult with no medicine order since
  unpaidAfterDays: 2, // medicine order still unpaid after this long
  refillWithinDays: 5, // supply ends within this many days, no newer order
  followUpFromDays: 28, // last visit at least this long ago…
  followUpToDays: 42, // …and at most this long (then it stops nagging)
};

const DAY = 24 * 60 * 60 * 1000;

function istDayBounds(dt) {
  const start = dt.setZone(IST_ZONE).startOf("day");
  return [start.toUTC().toJSDate(), start.plus({ days: 1 }).toUTC().toJSDate()];
}

const daysAgo = (then, now) => Math.floor((now - new Date(then)) / DAY);

/**
 * Gather the digest for `slot` ("morning" | "evening") as of `now`.
 * Morning lists today's schedule, evening tomorrow's; the to-dos are the same
 * rules either way.
 */
export async function collectDoctorDigest({ slot, now = nowUtc() }) {
  const nowDt = DateTime.fromJSDate(now);
  const scheduleDay = slot === "evening" ? nowDt.plus({ days: 1 }) : nowDt;
  const [dayStart, dayEnd] = istDayBounds(scheduleDay);
  const [, tomorrowEnd] = istDayBounds(nowDt.plus({ days: 1 }));

  const schedule = await db
    .select({ appt: appointments, serviceTitle: services.title })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(
      and(
        eq(appointments.status, "confirmed"),
        gte(appointments.startAt, dayStart),
        lt(appointments.startAt, dayEnd),
      ),
    )
    .orderBy(asc(appointments.startAt));

  // Online consults about to happen with no way for the patient to join.
  const noLink = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.status, "confirmed"),
        eq(appointments.mode, "online"),
        isNull(appointments.meetingLink),
        gte(appointments.startAt, now),
        lt(appointments.startAt, tomorrowEnd),
      ),
    )
    .orderBy(asc(appointments.startAt));

  // Over, but never marked completed.
  const toComplete = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.status, "confirmed"), lt(appointments.endAt, now)))
    .orderBy(asc(appointments.startAt))
    .limit(50);

  // All medicine orders, with their patient — small volumes; the rules below
  // compare orders against each other and against consults.
  const orders = await db
    .select({ order: medicationOrders, name: patients.name, phone: patients.phone })
    .from(medicationOrders)
    .innerJoin(patients, eq(medicationOrders.patientId, patients.id));

  // Completed recently with no medicine order since (the doctor's stand-in
  // for "prescription given": she dispenses the medicines herself).
  const recentCompleted = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.status, "completed"),
        isNotNull(appointments.patientId),
        gte(appointments.startAt, new Date(now - THRESHOLDS.medicineOrderWindowDays * DAY)),
      ),
    )
    .orderBy(asc(appointments.startAt));
  const needOrder = recentCompleted.filter(
    (a) =>
      !orders.some(
        (o) =>
          o.order.patientId === a.patientId &&
          o.order.status !== "cancelled" &&
          new Date(o.order.createdAt) >= new Date(a.startAt),
      ),
  );

  const unpaid = orders.filter(
    (o) =>
      o.order.status === "pending_payment" &&
      daysAgo(o.order.createdAt, now) >= THRESHOLDS.unpaidAfterDays,
  );

  const toShip = orders.filter((o) => o.order.status === "paid");

  // Supply about to run out and nothing newer ordered — the patient gets a
  // refill prompt, but can only pay for an order the doctor has created.
  const refill = orders
    .filter((o) => ["paid", "shipped"].includes(o.order.status) && o.order.chosenDurationDays)
    .map((o) => {
      const from = new Date(o.order.shippedAt || o.order.paidAt || o.order.createdAt);
      return { ...o, endsAt: new Date(from.getTime() + o.order.chosenDurationDays * DAY) };
    })
    .filter(
      (o) =>
        o.endsAt >= now &&
        o.endsAt <= new Date(now.getTime() + THRESHOLDS.refillWithinDays * DAY) &&
        !orders.some(
          (n) =>
            n.order.patientId === o.order.patientId &&
            n.order.id !== o.order.id &&
            n.order.status !== "cancelled" &&
            new Date(n.order.createdAt) > new Date(o.order.createdAt),
        ),
    );

  // Follow-up due: last completed visit 4–6 weeks ago and nothing booked or
  // held since. The window is what stops it repeating forever.
  const visits = await db
    .select({
      patientId: appointments.patientId,
      status: appointments.status,
      startAt: appointments.startAt,
    })
    .from(appointments)
    .where(
      and(
        isNotNull(appointments.patientId),
        inArray(appointments.status, ["pending_payment", "confirmed", "completed"]),
      ),
    );
  const lastByPatient = new Map();
  for (const v of visits) {
    const cur = lastByPatient.get(v.patientId);
    if (!cur || new Date(v.startAt) > new Date(cur.startAt)) lastByPatient.set(v.patientId, v);
  }
  const dueIds = [...lastByPatient.values()]
    .filter((v) => {
      if (v.status !== "completed") return false; // something later is booked
      const d = daysAgo(v.startAt, now);
      return d >= THRESHOLDS.followUpFromDays && d <= THRESHOLDS.followUpToDays;
    })
    .map((v) => v.patientId);
  const followUp = dueIds.length
    ? (await db.select().from(patients).where(inArray(patients.id, dueIds))).map((p) => ({
        patient: p,
        last: lastByPatient.get(p.id).startAt,
      }))
    : [];

  const reviews = await db
    .select()
    .from(testimonials)
    .where(and(eq(testimonials.published, false), isNotNull(testimonials.patientId)));

  const messages = await db
    .select()
    .from(contactMessages)
    .where(eq(contactMessages.read, false))
    .orderBy(asc(contactMessages.createdAt));

  return {
    slot,
    now,
    scheduleDate: scheduleDay.setZone(IST_ZONE).toISODate(),
    schedule,
    todos: {
      noLink,
      toComplete,
      needOrder,
      unpaid,
      toShip,
      refill,
      followUp,
      reviews,
    },
    messages,
  };
}

export function todoCount(d) {
  return Object.values(d.todos).reduce((n, list) => n + list.length, 0);
}

/** Plain-text email + calendar description. */
export function renderDoctorDigest(d, { baseUrl, doctorName }) {
  const link = (path) => `${baseUrl}${path}`;
  const when = (v) => formatIst(v, "dd LLL, hh:mm a");
  const day = DateTime.fromISO(d.scheduleDate, { zone: IST_ZONE }).toFormat("ccc d LLL");
  const count = todoCount(d);
  const lines = [];
  const section = (title, items, path) => {
    if (!items.length) return;
    lines.push("", `${title} (${items.length})`);
    for (const it of items) lines.push(`• ${it}`);
    if (path) lines.push(`  → ${link(path)}`);
  };

  lines.push(
    d.slot === "evening"
      ? `Good evening, ${doctorName}. Here is what is still open today.`
      : `Good morning, ${doctorName}. Here is your day.`,
  );

  section(
    d.slot === "evening" ? `TOMORROW'S CONSULTATIONS · ${day}` : `TODAY'S CONSULTATIONS · ${day}`,
    d.schedule.map(
      ({ appt: a, serviceTitle }) =>
        `${formatIst(a.startAt, "hh:mm a")} — ${a.patientName} · ${serviceTitle || "Consultation"} · ` +
        (a.mode === "online" ? (a.meetingLink ? "online, video link ready" : "online, NO video link yet") : "clinic"),
    ),
    "/admin",
  );

  if (count) lines.push("", `TO DO (${count})`);
  const t = d.todos;
  section(
    "Add a video link — the patient cannot join without one",
    t.noLink.map((a) => `${a.patientName} — ${when(a.startAt)}`),
    "/admin/appointments",
  );
  section(
    "Mark the consultation completed",
    t.toComplete.map((a) => `${a.patientName} — ${when(a.startAt)}`),
    "/admin/appointments",
  );
  section(
    "Create the medicine order (no order since the consult)",
    t.needOrder.map((a) => `${a.patientName} — consulted ${when(a.startAt)}`),
    "/admin/medications",
  );
  section(
    "Ask for the medicine payment",
    t.unpaid.map(
      (o) =>
        `${o.name} (${o.phone}) — ${o.order.title}, waiting ${daysAgo(o.order.createdAt, d.now)} days`,
    ),
    "/admin/medications",
  );
  section(
    "Schedule delivery for paid medicines",
    t.toShip.map(
      (o) =>
        `${o.name} — ${o.order.title}, ₹${o.order.amountInr}, paid ${daysAgo(o.order.paidAt, d.now)} day(s) ago`,
    ),
    "/admin/medications",
  );
  section(
    "Prepare the next medicine order — supply running out",
    t.refill.map((o) => `${o.name} — ${o.order.title}, runs out ${formatIst(o.endsAt, "dd LLL")}`),
    "/admin/medications",
  );
  section(
    "Follow-up due — send the follow-up nudge",
    t.followUp.map((f) => `${f.patient.name} — last visit ${formatIst(f.last, "dd LLL")}`),
    "/admin/patients",
  );
  section(
    "Patient reviews waiting to be published",
    t.reviews.map((r) => `${r.patientName}${r.rating ? ` — ${r.rating}★` : ""}`),
    "/admin/content",
  );

  if (d.messages.length) {
    lines.push("", `NEW MESSAGES FROM THE WEBSITE (${d.messages.length})`);
    for (const m of d.messages) {
      const contact = [m.phone, m.email].filter(Boolean).join(" · ") || "no contact given";
      lines.push(`• ${m.name} (${contact}) — ${formatIst(m.createdAt, "dd LLL, hh:mm a")}`);
      lines.push(`  "${m.message}"`);
    }
  }

  if (!count && !d.messages.length) lines.push("", "Nothing else is waiting on you.");
  lines.push("", "— Sent automatically by your website every morning and evening.");

  const label = d.slot === "evening" ? "evening wrap-up" : "morning to-dos";
  const dateLabel = formatIst(d.now, "dd LLL");
  return {
    subject: `ARYA ${label} · ${dateLabel}${count ? ` — ${count} to do` : ""}`,
    text: lines.join("\n"),
    calendarSummary: `ARYA to-dos (${count + d.messages.length})`,
  };
}

/* Calendar event ids must use base32hex (0-9, a-v). One id per day and slot,
   so a re-run rewrites the same entry. The tag keeps a local database's runs
   from ever touching production's entries on the same calendar. */
const B32HEX = "0123456789abcdefghijklmnopqrstuv";
function envTag() {
  let host = "local";
  try {
    host = new URL(process.env.DATABASE_URL).host;
  } catch {
    /* keep the default */
  }
  const h = createHash("sha1").update(host).digest();
  return Array.from(h.subarray(0, 5), (b) => B32HEX[b % 32]).join("");
}
export function todoEventId(dateStr, slot) {
  return `todo${dateStr.replaceAll("-", "")}${slot === "evening" ? "pm" : "am"}${envTag()}`;
}

/**
 * Build and deliver the digest. Nothing at all to report ⇒ nothing is sent.
 * The calendar entry is only made when there is something to DO (her diary
 * already shows the appointments themselves). `deps` exists for tests.
 */
export async function sendDoctorDigest({
  slot,
  now = nowUtc(),
  deps = { sendEmail, upsertTodoEvent },
}) {
  const d = await collectDoctorDigest({ slot, now });
  const count = todoCount(d);
  const counts = {
    schedule: d.schedule.length,
    todos: count,
    messages: d.messages.length,
  };
  if (!d.schedule.length && !count && !d.messages.length) {
    return { sent: false, reason: "nothing_to_report", counts };
  }

  const { payee_name: doctorName } = await getSettings(["payee_name"]);
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const { subject, text, calendarSummary } = renderDoctorDigest(d, {
    baseUrl,
    doctorName: doctorName || "Doctor",
  });

  let email = { skipped: true, reason: "no_recipient" };
  if (process.env.GMAIL_USER) {
    try {
      email = await deps.sendEmail({ to: process.env.GMAIL_USER, subject, text });
    } catch (err) {
      console.error("[doctor-digest] email failed:", err?.message || err);
      email = { failed: true, error: String(err?.message || err) };
    }
  }

  // The email is how contact-form messages reach her; only once it has
  // actually gone out are they marked read.
  if (email.sent && d.messages.length) {
    await db
      .update(contactMessages)
      .set({ read: true })
      .where(inArray(contactMessages.id, d.messages.map((m) => m.id)));
  }

  let calendar = { skipped: true, reason: "nothing_to_do" };
  if (count || d.messages.length) {
    calendar = await deps.upsertTodoEvent({
      id: todoEventId(formatIst(now, "yyyy-MM-dd"), slot),
      summary: calendarSummary,
      description: text,
      start: new Date(now.getTime() + 5 * 60 * 1000),
    });
  }

  return { sent: Boolean(email.sent), email, calendar, counts, subject };
}

