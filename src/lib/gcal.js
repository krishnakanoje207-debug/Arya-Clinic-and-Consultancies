import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, services } from "@/db/schema";
import { getAccessToken, googleConfigured } from "@/lib/google-auth";

/**
 * Optional Google Calendar sync for the doctor's own calendar. A confirmed
 * booking creates an event; a reschedule patches its times; a cancellation
 * deletes it. Marking a consult completed intentionally leaves the event in
 * place (it happened). Zero npm deps: reuses the shared service-account JWT
 * (src/lib/google-auth.js) and calls the Calendar REST API directly.
 *
 * Env: GOOGLE_SERVICE_ACCOUNT_JSON (shared) + GOOGLE_CALENDAR_ID = the target
 * calendar, shared ("Make changes to events") with the service-account's
 * client_email. BEST-EFFORT: unset ⇒ silently no-op (log once, never throw,
 * never block the admin action).
 */

const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const IST_ZONE = "Asia/Kolkata";

let warned = false;
export function calendarConfigured() {
  return googleConfigured() && Boolean(process.env.GOOGLE_CALENDAR_ID);
}

function noop() {
  if (!warned) {
    console.log("[gcal] GOOGLE_CALENDAR_ID unset — skipping Calendar sync.");
    warned = true;
  }
  return { ok: false, skipped: true };
}

function calId() {
  return encodeURIComponent(process.env.GOOGLE_CALENDAR_ID);
}

async function serviceTitleFor(appt) {
  if (!appt.serviceId) return "Consultation";
  const [s] = await db
    .select({ title: services.title })
    .from(services)
    .where(eq(services.id, appt.serviceId));
  return s?.title || "Consultation";
}

function eventBody(appt, serviceTitle) {
  const start = new Date(appt.startAt).toISOString();
  const end = new Date(appt.endAt).toISOString();
  const modeLabel = appt.mode === "clinic" ? "Clinic" : "Online";
  const description =
    `Phone: ${appt.patientPhone || "—"}\n` +
    `Service: ${serviceTitle}\n` +
    `Mode: ${modeLabel}\n` +
    `Problem: ${appt.problemNote || "—"}` +
    (appt.meetingLink ? `\nMeeting: ${appt.meetingLink}` : "");
  return {
    summary: `Consultation — ${appt.patientName}`,
    description,
    start: { dateTime: start, timeZone: IST_ZONE },
    end: { dateTime: end, timeZone: IST_ZONE },
  };
}

/**
 * Create a calendar event for a confirmed appointment and store its id in
 * appointments.google_event_id. No-ops when unconfigured or when an event id
 * already exists (avoids duplicates on re-confirm). Never throws.
 */
export async function createAppointmentEvent(appt) {
  try {
    if (!calendarConfigured()) return noop();
    if (appt.googleEventId) return { ok: true, already: true };
    const serviceTitle = await serviceTitleFor(appt);
    const token = await getAccessToken(SCOPE);
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calId()}/events`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(eventBody(appt, serviceTitle)),
      },
    );
    if (!res.ok) throw new Error(`Calendar insert: ${res.status} ${await res.text()}`);
    const { id } = await res.json();
    if (id) {
      await db
        .update(appointments)
        .set({ googleEventId: id })
        .where(eq(appointments.id, appt.id));
    }
    return { ok: true, id };
  } catch (err) {
    console.error("[gcal] create failed:", err?.message || err);
    return { ok: false, error: String(err?.message || err) };
  }
}

/**
 * Patch an event's times after a reschedule. Creates the event instead when
 * there is no stored id yet and the appointment is confirmed. Never throws.
 */
export async function updateAppointmentEvent(appt) {
  try {
    if (!calendarConfigured()) return noop();
    if (!appt.googleEventId) {
      return appt.status === "confirmed"
        ? createAppointmentEvent(appt)
        : { ok: false, skipped: true };
    }
    const serviceTitle = await serviceTitleFor(appt);
    const token = await getAccessToken(SCOPE);
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calId()}/events/${encodeURIComponent(appt.googleEventId)}`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(eventBody(appt, serviceTitle)),
      },
    );
    // Event vanished on Google's side — recreate so the calendar stays in sync.
    if (res.status === 404 || res.status === 410) {
      await db
        .update(appointments)
        .set({ googleEventId: null })
        .where(eq(appointments.id, appt.id));
      return createAppointmentEvent({ ...appt, googleEventId: null });
    }
    if (!res.ok) throw new Error(`Calendar patch: ${res.status} ${await res.text()}`);
    return { ok: true };
  } catch (err) {
    console.error("[gcal] update failed:", err?.message || err);
    return { ok: false, error: String(err?.message || err) };
  }
}

/**
 * Delete the event on cancellation. Ignores 404/410 (already gone). Clears the
 * stored id. Never throws.
 */
export async function deleteAppointmentEvent(appt) {
  try {
    if (!calendarConfigured()) return noop();
    if (!appt.googleEventId) return { ok: true, already: true };
    const token = await getAccessToken(SCOPE);
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calId()}/events/${encodeURIComponent(appt.googleEventId)}`,
      { method: "DELETE", headers: { authorization: `Bearer ${token}` } },
    );
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      throw new Error(`Calendar delete: ${res.status} ${await res.text()}`);
    }
    await db
      .update(appointments)
      .set({ googleEventId: null })
      .where(eq(appointments.id, appt.id));
    return { ok: true };
  } catch (err) {
    console.error("[gcal] delete failed:", err?.message || err);
    return { ok: false, error: String(err?.message || err) };
  }
}
