import { and, eq, inArray, lt } from "drizzle-orm";
import { DateTime } from "luxon";
import { db } from "@/db";
import { appointmentSummaries, appointments, services } from "@/db/schema";
import { emailConfigured, sendEmail } from "@/lib/notify/email";
import { uploadToDrive, driveConfigured } from "@/lib/archive-drive";
import { formatIst } from "@/lib/time";

/**
 * Threshold-based archival safety valve (plan §3.4).
 *
 * Exports appointments older than 12 months (completed/cancelled ONLY) as
 * CSV + JSON, delivers them to the doctor's own Gmail (and optionally a
 * Drive folder), and only AFTER confirmed delivery: writes slim
 * appointment_summaries rows (visit history stays in admin forever) and
 * deletes the archived rows from Neon.
 *
 * Ordering is the correctness contract:
 *   fetch → deliver (throws = abort, nothing deleted)
 *         → insert summaries (idempotent re-run: skips existing ids)
 *         → delete
 * A crash after delivery but before delete re-archives the same rows next
 * run — duplicate emails are acceptable; data loss is not.
 */

const ARCHIVE_MONTHS = 12;
const ARCHIVABLE_STATUSES = ["completed", "cancelled"];

function csvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(rows) {
  const header = [
    "id", "status", "patient_name", "phone", "email", "service", "mode",
    "start_ist", "end_ist", "amount_inr", "utr", "intake_answers",
    "doctor_notes", "created_ist",
  ];
  const lines = [header.join(",")];
  for (const { a, serviceTitle } of rows) {
    lines.push(
      [
        a.id, a.status, a.patientName, a.patientPhone, a.patientEmail,
        serviceTitle, a.mode, formatIst(a.startAt), formatIst(a.endAt),
        a.amountInr, a.utr,
        a.intakeAnswers ? JSON.stringify(a.intakeAnswers) : "",
        a.doctorNotes, formatIst(a.createdAt),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return "﻿" + lines.join("\r\n");
}

/** Rows eligible for archival right now. */
export async function getArchivableRows() {
  const cutoff = DateTime.utc().minus({ months: ARCHIVE_MONTHS }).toJSDate();
  return db
    .select({ a: appointments, serviceTitle: services.title })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(
      and(
        inArray(appointments.status, ARCHIVABLE_STATUSES),
        lt(appointments.startAt, cutoff),
      ),
    );
}

export async function runArchival({ dryRun = false } = {}) {
  const rows = await getArchivableRows();
  if (!rows.length) {
    return { ok: true, archived: 0, message: "Nothing older than 12 months to archive." };
  }
  if (dryRun) {
    return { ok: true, archived: 0, eligible: rows.length, dryRun: true };
  }

  if (!emailConfigured()) {
    return {
      ok: false,
      error:
        "Email is not configured (GMAIL_USER / GMAIL_APP_PASSWORD). Archival never deletes without confirmed delivery, so it cannot run.",
    };
  }

  const stamp = DateTime.now().setZone("Asia/Kolkata").toFormat("yyyy-MM-dd");
  const csv = buildCsv(rows);
  const json = JSON.stringify(
    rows.map(({ a, serviceTitle }) => ({ ...a, serviceTitle })),
    null,
    2,
  );
  const attachments = [
    { filename: `appointments-archive-${stamp}.csv`, content: csv, contentType: "text/csv; charset=utf-8" },
    { filename: `appointments-archive-${stamp}.json`, content: json, contentType: "application/json" },
  ];

  // 1) DELIVERY — the gate. sendEmail resolving = Gmail accepted the mail.
  //    Any throw aborts the run with nothing modified.
  await sendEmail({
    to: process.env.GMAIL_USER,
    subject: `[Archive] ${rows.length} appointments older than ${ARCHIVE_MONTHS} months — ${stamp}`,
    text:
      `Attached: full export of ${rows.length} archived appointments (completed/cancelled, ` +
      `older than ${ARCHIVE_MONTHS} months).\n\nThese rows have been removed from the site's ` +
      `database; slim summary rows remain visible in the admin panel. Keep this email — ` +
      `it is the permanent record (medical-record retention ~3 years).`,
    attachments,
  });

  // Optional second copy to Drive — best-effort, never blocks the run.
  let driveUploaded = false;
  if (driveConfigured()) {
    try {
      await uploadToDrive(`appointments-archive-${stamp}.json`, json, "application/json");
      await uploadToDrive(`appointments-archive-${stamp}.csv`, csv, "text/csv");
      driveUploaded = true;
    } catch (err) {
      console.error("[archive] Drive upload failed (email already delivered):", err?.message);
    }
  }

  // 2) SUMMARIES — slim rows kept forever. Idempotent: skip ids that
  //    already have a summary (from a previous crashed run).
  const ids = rows.map(({ a }) => a.id);
  const existing = await db
    .select({ appointmentId: appointmentSummaries.appointmentId })
    .from(appointmentSummaries)
    .where(inArray(appointmentSummaries.appointmentId, ids));
  const have = new Set(existing.map((r) => r.appointmentId));
  const fresh = rows.filter(({ a }) => !have.has(a.id));
  if (fresh.length) {
    await db.insert(appointmentSummaries).values(
      fresh.map(({ a, serviceTitle }) => ({
        appointmentId: a.id,
        patientName: a.patientName,
        patientPhone: a.patientPhone,
        serviceTitle: serviceTitle || "Consultation",
        startAt: a.startAt,
        outcome: a.status,
        archivedAt: new Date(),
      })),
    );
  }

  // 3) DELETE — only now, with delivery + summaries both confirmed.
  await db.delete(appointments).where(inArray(appointments.id, ids));

  return { ok: true, archived: ids.length, driveUploaded };
}
