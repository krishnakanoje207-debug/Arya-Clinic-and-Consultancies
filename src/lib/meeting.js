/**
 * When a video consultation's join link is actually usable.
 *
 * A Google Meet URL never expires, so a link handed out at booking time is a
 * standing invitation: anyone holding it could drop into the doctor's room
 * days early, or return long after their consult. The dashboard therefore
 * reveals the Join button only inside a window around the appointment, and
 * shows the opening time before that.
 *
 * The window is deliberately generous at the end — consults overrun, and a
 * patient who reconnects after a dropout must not be locked out.
 */

export const JOIN_OPENS_MINUTES_BEFORE = 10;
export const JOIN_CLOSES_MINUTES_AFTER = 30;

/** Window boundaries plus where `now` sits relative to them. */
export function joinWindow(appt, now = new Date()) {
  const opensAt = new Date(
    new Date(appt.startAt).getTime() - JOIN_OPENS_MINUTES_BEFORE * 60000,
  );
  const closesAt = new Date(
    new Date(appt.endAt).getTime() + JOIN_CLOSES_MINUTES_AFTER * 60000,
  );
  const t = now.getTime();
  return {
    opensAt,
    closesAt,
    isOpen: t >= opensAt.getTime() && t <= closesAt.getTime(),
    hasClosed: t > closesAt.getTime(),
  };
}

/** True when this appointment's Join button should be live right now. */
export function canJoin(appt, now = new Date()) {
  if (appt.status !== "confirmed" || !appt.meetingLink) return false;
  return joinWindow(appt, now).isOpen;
}
