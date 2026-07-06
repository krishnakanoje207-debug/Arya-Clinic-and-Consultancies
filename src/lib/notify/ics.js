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

export function buildIcs({ appt, serviceTitle, doctorName, location }) {
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
      appt.meetingLink
        ? `Join: ${appt.meetingLink}`
        : "Your consultation appointment.",
    )}`,
    `LOCATION:${icsEscape(location || (appt.mode === "online" ? "Online" : ""))}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
