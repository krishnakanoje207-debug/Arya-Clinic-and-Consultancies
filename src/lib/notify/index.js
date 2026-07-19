import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { messageTemplates, patients, services } from "@/db/schema";
import { getSettings } from "@/lib/settings";
import { daysLeftForOrder } from "@/lib/medications";
import { buildValues, renderTemplate } from "./render";
import { sendEmail } from "./email";
import { sendSms, smsConfigured } from "./sms";
import { buildIcs } from "./ics";

/**
 * Channel-independent notification dispatcher (plan §7). One call per
 * booking event; each configured channel is attempted independently —
 * an SMS-gateway outage never blocks the email, and vice versa. NEVER
 * throws: a notification failure must not fail the booking transaction
 * that triggered it. Swapping the SMS provider (textbee → MSG91) or
 * adding WhatsApp Cloud API later means editing sms.js / adding a
 * channel module — not touching any caller.
 *
 * events: booking_received | payment_received | confirmed | reminder |
 *         rescheduled | cancelled | follow_up
 */
export async function dispatchNotification(event, appt, opts = {}) {
  try {
    const [templates, settings, serviceTitle, dashboardToken] = await Promise.all([
      db
        .select()
        .from(messageTemplates)
        .where(
          and(eq(messageTemplates.event, event), eq(messageTemplates.active, true)),
        ),
      getSettings([
        "upi_id",
        "payee_name",
        "contact_whatsapp",
        "clinic_address",
        "contact_email",
      ]),
      opts.serviceTitle
        ? Promise.resolve(opts.serviceTitle)
        : db
            .select({ title: services.title })
            .from(services)
            .where(eq(services.id, appt.serviceId))
            .then((r) => r[0]?.title || "Consultation"),
      appt.patientId
        ? db
            .select({ token: patients.dashboardToken })
            .from(patients)
            .where(eq(patients.id, appt.patientId))
            .then((r) => r[0]?.token || null)
        : Promise.resolve(null),
    ]);

    const values = buildValues(appt, serviceTitle, settings, dashboardToken);
    const emailTpl = templates.find((t) => t.channel === "email");
    const smsTpl = templates.find((t) => t.channel === "sms");

    const attachments = opts.includeIcs
      ? [
          {
            filename: "appointment.ics",
            content: buildIcs({
              appt,
              serviceTitle,
              doctorName: values.doctor_name,
              location:
                appt.mode === "clinic" ? settings.clinic_address : appt.meetingLink,
            }),
            contentType: "text/calendar; charset=utf-8; method=PUBLISH",
          },
        ]
      : undefined;

    const results = await Promise.allSettled([
      // Patient email
      emailTpl && appt.patientEmail
        ? sendEmail({
            to: appt.patientEmail,
            subject: renderTemplate(emailTpl.subject || event, values),
            text: renderTemplate(emailTpl.body, values),
            attachments,
          })
        : Promise.resolve({ skipped: true }),
      // Patient SMS
      smsTpl
        ? sendSms({
            to: appt.patientPhone,
            message: renderTemplate(smsTpl.body, values),
          })
        : Promise.resolve({ skipped: true }),
      // Doctor's own inbox copy for actionable events
      opts.notifyDoctor && process.env.GMAIL_USER
        ? sendEmail({
            to: process.env.GMAIL_USER,
            subject: `[Site] ${event}: ${appt.patientName} — ${values.date} ${values.time}`,
            text:
              `${event.toUpperCase()}\n` +
              `Patient: ${appt.patientName} (${appt.patientPhone})\n` +
              `Service: ${serviceTitle}\nWhen: ${values.date} ${values.time}\n` +
              `Amount: ₹${values.amount}\nUTR: ${appt.utr || "—"}\n` +
              `Admin: ${process.env.NEXT_PUBLIC_SITE_URL || ""}/admin/appointments`,
          })
        : Promise.resolve({ skipped: true }),
    ]);

    for (const [i, r] of results.entries()) {
      if (r.status === "rejected") {
        console.error(
          `[notify] ${event} channel ${["email", "sms", "doctor"][i]} failed:`,
          r.reason?.message || r.reason,
        );
      }
    }
  } catch (err) {
    console.error(`[notify] ${event} dispatch failed:`, err?.message || err);
  }
}

/**
 * Notify the doctor of a new self-assessment quiz lead (T8). The quiz lead
 * has no appointment/service, so a hardcoded render is simpler than a
 * templated event — it reuses the same doctor-inbox mechanism the booking
 * flow uses (email to GMAIL_USER). Never throws: a notification failure
 * must not fail the lead capture. SMS is intentionally not sent to the
 * doctor here — the booking flow doesn't SMS the doctor either.
 */
export async function dispatchLeadNotification(lead) {
  try {
    if (!process.env.GMAIL_USER) return;
    const admin = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/admin/quiz-leads`;
    await sendEmail({
      to: process.env.GMAIL_USER,
      subject: `[Site] New quiz lead: ${lead.quizName} (${lead.resultKey})`,
      text:
        `NEW SELF-CHECK LEAD\n` +
        `Quiz: ${lead.quizName}\n` +
        `Phone: ${lead.phone}\n` +
        `Result: ${lead.resultKey} (${lead.score}/${lead.maxScore})\n` +
        `Admin: ${admin}`,
    });
  } catch (err) {
    console.error(`[notify] quiz lead dispatch failed:`, err?.message || err);
  }
}

/** Placeholder values for a medication reminder. Mirrors buildValues'
 * conventions (dashboard_link, whatsapp_link) but sourced from the medication
 * order + its patient rather than an appointment. */
function buildMedicationValues(order, patient, settings, daysLeft) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const wa = settings.contact_whatsapp
    ? `https://wa.me/${String(settings.contact_whatsapp).replace(/\D/g, "")}`
    : "";
  return {
    patient_name: patient.name || "",
    medication_title: order.title || "",
    days_left: daysLeft == null ? "" : String(daysLeft),
    dashboard_link:
      siteUrl && patient.dashboardToken
        ? `${siteUrl}/patient/${patient.dashboardToken}`
        : "",
    clinic_phone: settings.contact_phone || "",
    whatsapp_link: wa,
    doctor_name: settings.payee_name || "Dr. Seema",
  };
}

/** Placeholder values for a patient follow-up nudge. Mirrors
 * buildMedicationValues' conventions (dashboard_link, whatsapp_link) but
 * sourced from the patient alone — a follow-up nudge has no appointment. */
function buildFollowUpValues(patient, settings) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const wa = settings.contact_whatsapp
    ? `https://wa.me/${String(settings.contact_whatsapp).replace(/\D/g, "")}`
    : "";
  return {
    patient_name: patient.name || "",
    doctor_name: settings.payee_name || "Dr. Seema",
    dashboard_link:
      siteUrl && patient.dashboardToken
        ? `${siteUrl}/patient/${patient.dashboardToken}`
        : "",
    whatsapp_link: wa,
  };
}

/**
 * Send a patient a "time for a follow-up?" nudge on demand (admin button).
 * Patient-based, no appointment. Uses the admin-editable follow_up templates
 * (email + sms); when a channel has no template row it falls back to hard-coded
 * English defaults matching the seeded follow_up text. Email goes out only when
 * the patient has one; SMS only when the gateway is configured. Channels are
 * independent and this NEVER throws. Returns which channels actually sent,
 * e.g. { email: true, sms: false }. */
export async function dispatchFollowUpNudge(patient) {
  const sent = { email: false, sms: false };
  try {
    const [templates, settings] = await Promise.all([
      db
        .select()
        .from(messageTemplates)
        .where(
          and(
            eq(messageTemplates.event, "follow_up"),
            eq(messageTemplates.active, true),
          ),
        ),
      getSettings(["payee_name", "contact_whatsapp"]),
    ]);

    const values = buildFollowUpValues(patient, settings);
    const emailTpl = templates.find((t) => t.channel === "email");
    const smsTpl = templates.find((t) => t.channel === "sms");

    // Hard-coded fallbacks matching the seeded follow_up template text.
    const defaults = {
      subject: "Time for a follow-up?",
      body:
        `Hi ${values.patient_name}, hope you're feeling better. Book a follow-up ` +
        `with ${values.doctor_name} anytime from your dashboard: ${values.dashboard_link}`,
    };

    const emailSubject = emailTpl
      ? renderTemplate(emailTpl.subject || defaults.subject, values)
      : defaults.subject;
    const emailBody = emailTpl
      ? renderTemplate(emailTpl.body, values)
      : defaults.body;
    const smsBody = smsTpl ? renderTemplate(smsTpl.body, values) : defaults.body;

    const results = await Promise.allSettled([
      patient.email
        ? sendEmail({ to: patient.email, subject: emailSubject, text: emailBody })
        : Promise.resolve({ skipped: true }),
      smsConfigured()
        ? sendSms({ to: patient.phone, message: smsBody })
        : Promise.resolve({ skipped: true }),
    ]);

    sent.email =
      results[0].status === "fulfilled" && results[0].value?.sent === true;
    sent.sms =
      results[1].status === "fulfilled" && results[1].value?.sent === true;

    for (const [i, r] of results.entries()) {
      if (r.status === "rejected") {
        console.error(
          `[notify] follow_up nudge channel ${["email", "sms"][i]} failed:`,
          r.reason?.message || r.reason,
        );
      }
    }
  } catch (err) {
    console.error(`[notify] follow_up nudge dispatch failed:`, err?.message || err);
  }
  return sent;
}

/**
 * Medication reminder dispatcher (plan §7, medication flow). kind is
 * 'medication_dose' (daily "take your medicine") or 'medication_refill'
 * (one-time "supply runs out soon — reorder"). Looks up admin-editable
 * templates by event = kind; when none exist it falls back to sensible
 * hard-coded English defaults (mirrors dispatchLeadNotification's
 * simpler-option pattern). SMS goes to patient.phone (sms.js adds +91), email
 * only when the patient has one. NEVER throws — a reminder failure must not
 * break the cron batch.
 */
export async function dispatchMedicationReminder(kind, order, patient) {
  try {
    const [templates, settings] = await Promise.all([
      db
        .select()
        .from(messageTemplates)
        .where(
          and(eq(messageTemplates.event, kind), eq(messageTemplates.active, true)),
        ),
      getSettings([
        "payee_name",
        "contact_phone",
        "contact_whatsapp",
      ]),
    ]);

    const daysLeft = daysLeftForOrder(order);
    const values = buildMedicationValues(order, patient, settings, daysLeft);
    const emailTpl = templates.find((t) => t.channel === "email");
    const smsTpl = templates.find((t) => t.channel === "sms");

    // Hard-coded fallbacks when the doctor hasn't authored a template row.
    const defaults =
      kind === "medication_refill"
        ? {
            subject: `Reorder your ${order.title}`,
            body:
              `Hello ${values.patient_name}, your ${order.title} supply runs out ` +
              `in about 3 days — reorder & pay from your dashboard: ${values.dashboard_link}`,
          }
        : {
            subject: `Time for today's dose`,
            body: `Hello ${values.patient_name}, it's time for today's dose of ${order.title}.`,
          };

    const emailSubject = emailTpl
      ? renderTemplate(emailTpl.subject || defaults.subject, values)
      : defaults.subject;
    const emailBody = emailTpl
      ? renderTemplate(emailTpl.body, values)
      : defaults.body;
    const smsBody = smsTpl ? renderTemplate(smsTpl.body, values) : defaults.body;

    const results = await Promise.allSettled([
      patient.email
        ? sendEmail({ to: patient.email, subject: emailSubject, text: emailBody })
        : Promise.resolve({ skipped: true }),
      patient.phone
        ? sendSms({ to: patient.phone, message: smsBody })
        : Promise.resolve({ skipped: true }),
    ]);

    for (const [i, r] of results.entries()) {
      if (r.status === "rejected") {
        console.error(
          `[notify] ${kind} channel ${["email", "sms"][i]} failed:`,
          r.reason?.message || r.reason,
        );
      }
    }
  } catch (err) {
    console.error(`[notify] ${kind} dispatch failed:`, err?.message || err);
  }
}
