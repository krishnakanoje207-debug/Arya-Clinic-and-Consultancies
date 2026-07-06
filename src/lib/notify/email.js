import nodemailer from "nodemailer";

/**
 * Gmail SMTP via app password (launch channel — Resend needs a verified
 * custom domain, which is optional in this project). ~100–500 mails/day
 * is ample at clinic scale.
 */
let transport = null;

function getTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return transport;
}

export function emailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

/** Send one email. attachments: nodemailer format ([{filename, content,
 * contentType}]). Throws on transport errors — the dispatcher catches per
 * channel so SMS still goes out if email fails. */
export async function sendEmail({ to, subject, text, attachments }) {
  const t = getTransport();
  if (!t) return { skipped: true, reason: "email_not_configured" };
  await t.sendMail({
    from: `"Dr. Seema" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
    attachments,
  });
  return { sent: true };
}
