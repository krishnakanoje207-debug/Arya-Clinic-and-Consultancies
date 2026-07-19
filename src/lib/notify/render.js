import { formatIst } from "@/lib/time";

/** Fill {placeholder} tokens in an admin-edited template. Unknown or
 * missing values render as empty strings — a typo'd placeholder must
 * never leak "{undefined}" into a patient message. */
export function renderTemplate(text, values) {
  return String(text || "").replace(/\{(\w+)\}/g, (_, key) =>
    values[key] != null ? String(values[key]) : "",
  );
}

/** Canonical placeholder values for an appointment (plan §7). */
export function buildValues(appt, serviceTitle, settings, dashboardToken) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const wa = settings.contact_whatsapp
    ? `https://wa.me/${String(settings.contact_whatsapp).replace(/\D/g, "")}`
    : "";
  return {
    patient_name: appt.patientName,
    date: formatIst(appt.startAt, "dd LLL yyyy"),
    time: formatIst(appt.startAt, "hh:mm a") + " IST",
    service: serviceTitle || "Consultation",
    amount: appt.amountInr,
    meet_link: appt.meetingLink || "",
    manage_link: siteUrl ? `${siteUrl}/manage/${appt.manageToken}` : "",
    dashboard_link:
      siteUrl && dashboardToken ? `${siteUrl}/patient/${dashboardToken}` : "",
    upi_id: settings.upi_id || "",
    doctor_name: settings.payee_name || "Dr. Seema",
    whatsapp_link: wa,
  };
}
