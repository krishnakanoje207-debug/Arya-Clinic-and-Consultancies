import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { messageTemplates, services } from "@/db/schema";
import { getSettings } from "@/lib/settings";
import { buildValues, renderTemplate } from "./render";
import { sendEmail } from "./email";
import { sendSms } from "./sms";
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
    const [templates, settings, serviceTitle] = await Promise.all([
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
    ]);

    const values = buildValues(appt, serviceTitle, settings);
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
