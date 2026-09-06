/** Minimal RFC 5545 .ics generator for the confirmation attachment. */

function icsDate(d) {
  // UTC, e.g. 20260704T083000Z
  return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEscape(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/* The raw meeting URL is deliberately NOT embedded here: this attachment
   rides on the confirmation email, which goes out as soon as payment lands,
   and a Meet URL never expires. The calendar entry points at the dashboard,
   which reveals the Join button only inside the appointment's window. */
export function buildIcs({
  appt,
  serviceTitle,
  doctorName,
  location,
  dashboardLink,
}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DrSeema//Booking//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:appt-${appt.id}-${appt.manageToken}@drseema`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(appt.startAt)}`,
    `DTEND:${icsDate(appt.endAt)}`,
    `SUMMARY:${icsEscape(`${serviceTitle} — ${doctorName}`)}`,
    `DESCRIPTION:${icsEscape(
      dashboardLink
        ? `Your appointment details and join link: ${dashboardLink}`
        : "Your consultation appointment.",
    )}`,
    `LOCATION:${icsEscape(location || (appt.mode === "online" ? "Online" : ""))}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
