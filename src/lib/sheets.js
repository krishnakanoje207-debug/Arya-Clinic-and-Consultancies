import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  medicationOrders,
  patients,
  services,
} from "@/db/schema";
import { formatIst } from "@/lib/time";
import { getAccessToken, googleConfigured } from "@/lib/google-auth";

/**
 * Optional Google Sheet ("Excel") of completed consultations. When a consult is
 * marked completed the doctor gets one appended row with the full picture, and
 * the /admin/queue export streams the SAME columns as an Excel-friendly CSV.
 * Zero npm deps: reuses the shared service-account JWT (src/lib/google-auth.js)
 * and calls the Sheets REST API directly.
 *
 * Env: GOOGLE_SERVICE_ACCOUNT_JSON (shared) + GOOGLE_SHEET_ID = the spreadsheet
 * id, shared (Editor) with the service-account's client_email. BEST-EFFORT:
 * unset ⇒ silently no-op (log once, never throw, never block the doctor).
 */

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

/** Column order shared by the Sheet append and the CSV export. */
export const COMPLETED_HEADERS = [
  "Completed (IST)",
  "Appointment date (IST)",
  "Appointment time (IST)",
  "Patient",
  "Phone",
  "Email",
  "Address",
  "Service",
  "Mode",
  "Problem note",
  "Intake",
  "Completed visits",
  "Active medication",
  "Medication titles",
  "Fee (INR)",
  "UTR",
];

let warned = false;
export function sheetsConfigured() {
  return googleConfigured() && Boolean(process.env.GOOGLE_SHEET_ID);
}

/** Flatten intake jsonb ({chiefComplaint, duration, …}) to "key: value | …". */
function flattenIntake(intake) {
  if (!intake || typeof intake !== "object") return "";
  return Object.entries(intake)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => `${k}: ${String(v).trim()}`)
    .join(" | ");
}

/** Turn a normalised picture into the shared ordered cell array. Pure — so the
 * CSV export and the Sheet append (and tests) all produce identical columns. */
export function buildCompletedRow(d) {
  return [
    d.completedIst || "",
    d.dateIst || "",
    d.timeIst || "",
    d.patientName || "",
    d.phone || "",
    d.email || "",
    d.address || "",
    d.serviceTitle || "",
    d.mode || "",
    d.problemNote || "",
    d.intake || "",
    d.completedVisits == null ? "" : String(d.completedVisits),
    d.medActive ? "yes" : "no",
    d.medTitles || "",
    d.amountInr == null ? "" : String(d.amountInr),
    d.utr || "",
  ];
}

/** Gather the full picture for one completed appointment (patient, service,
 * medication orders, this patient's completed-visit count) and return the
 * shared ordered cell array. Used by both the Sheet append and the CSV export. */
export async function assembleCompletedRow(appt, serviceTitle) {
  const patient = appt.patientId
    ? (
        await db
          .select()
          .from(patients)
          .where(eq(patients.id, appt.patientId))
      )[0] || null
    : null;

  let completedVisits = null;
  let medActive = false;
  let medTitles = "";
  if (appt.patientId) {
    const [{ n } = { n: 0 }] = await db
      .select({ n: sql`count(*)::int` })
      .from(appointments)
      .where(
        and(
          eq(appointments.patientId, appt.patientId),
          eq(appointments.status, "completed"),
        ),
      );
    completedVisits = n ?? 0;

    const meds = await db
      .select({ title: medicationOrders.title })
      .from(medicationOrders)
      .where(
        and(
          eq(medicationOrders.patientId, appt.patientId),
          ne(medicationOrders.status, "cancelled"),
        ),
      );
    medActive = meds.length > 0;
    medTitles = meds.map((m) => m.title).filter(Boolean).join("; ");
  }

  return buildCompletedRow({
    completedIst: appt.completedAt ? formatIst(appt.completedAt) : "",
    dateIst: formatIst(appt.startAt, "dd LLL yyyy"),
    timeIst: formatIst(appt.startAt, "hh:mm a"),
    patientName: appt.patientName,
    phone: appt.patientPhone,
    email: appt.patientEmail || patient?.email || "",
    address: patient?.address || "",
    serviceTitle,
    mode: appt.mode,
    problemNote: appt.problemNote,
    intake: flattenIntake(appt.intakeAnswers),
    completedVisits,
    medActive,
    medTitles,
    amountInr: appt.amountInr,
    utr: appt.utr,
  });
}

/** Every completed appointment as shared cell arrays, newest first — the CSV
 * export route's data source (same columns as the Sheet). */
export async function completedRowsForExport() {
  const rows = await db
    .select({ a: appointments, serviceTitle: services.title })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(eq(appointments.status, "completed"))
    .orderBy(sql`coalesce(${appointments.completedAt}, ${appointments.startAt}) desc`);
  const out = [];
  for (const { a, serviceTitle } of rows) {
    out.push(await assembleCompletedRow(a, serviceTitle || "Consultation"));
  }
  return out;
}

/** Make sure row 1 is the shared header row; insert it at the top if the sheet
 * is empty OR its first row is data (e.g. rows appended before the header
 * existed). Returns true when a header was written. */
export async function ensureHeaderRow(token, sheetId) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:A1`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Sheets get: ${res.status} ${await res.text()}`);
  const body = await res.json();
  const a1 = body.values?.[0]?.[0] || "";
  if (a1 === COMPLETED_HEADERS[0]) return false;

  if (a1) {
    // Row 1 holds data — push everything down one row first.
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (!metaRes.ok) {
      throw new Error(`Sheets meta: ${metaRes.status} ${await metaRes.text()}`);
    }
    const meta = await metaRes.json();
    const gid = meta.sheets?.[0]?.properties?.sheetId ?? 0;
    const insRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              insertDimension: {
                range: { sheetId: gid, dimension: "ROWS", startIndex: 0, endIndex: 1 },
                inheritFromBefore: false,
              },
            },
          ],
        }),
      },
    );
    if (!insRes.ok) {
      throw new Error(`Sheets insert: ${insRes.status} ${await insRes.text()}`);
    }
  }

  const putRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ values: [COMPLETED_HEADERS] }),
    },
  );
  if (!putRes.ok) {
    throw new Error(`Sheets header: ${putRes.status} ${await putRes.text()}`);
  }
  return true;
}

async function appendRows(token, sheetId, values) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ values }),
    },
  );
  if (!res.ok) throw new Error(`Sheets append: ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Append one completed appointment as a row to GOOGLE_SHEET_ID (making sure
 * the header row exists first). BEST-EFFORT: no-ops when unconfigured
 * and never throws — a Sheets outage must not break marking a consult complete.
 */
export async function appendCompletedAppointmentRow(appointmentId) {
  try {
    if (!sheetsConfigured()) {
      if (!warned) {
        console.log("[sheets] GOOGLE_SHEET_ID unset — skipping Sheet append.");
        warned = true;
      }
      return { ok: false, skipped: true };
    }
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const [row] = await db
      .select({ a: appointments, serviceTitle: services.title })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.id, Number(appointmentId)));
    if (!row) return { ok: false, reason: "not_found" };

    const cells = await assembleCompletedRow(row.a, row.serviceTitle || "Consultation");
    const token = await getAccessToken(SCOPE);
    await ensureHeaderRow(token, sheetId);
    await appendRows(token, sheetId, [cells]);
    return { ok: true };
  } catch (err) {
    console.error("[sheets] append failed:", err?.message || err);
    return { ok: false, error: String(err?.message || err) };
  }
}

/** Shareable link to the spreadsheet (or null when unset). */
export function sheetUrl() {
  return process.env.GOOGLE_SHEET_ID
    ? `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}`
    : null;
}
