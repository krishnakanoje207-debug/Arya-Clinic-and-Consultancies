import { DateTime } from "luxon";

/**
 * IST has no DST (fixed UTC+05:30), but we still go through a named zone so
 * arithmetic is explicit and never relies on the server's local time
 * (Vercel runs in UTC). All DB timestamps are UTC; the UI renders IST.
 */
export const IST_ZONE = "Asia/Kolkata";

/** Combine an IST calendar date ('yyyy-MM-dd') and wall-clock time
 * ('HH:mm' or 'HH:mm:ss') into a UTC JS Date for storage. */
export function istWallToUtc(dateStr, timeStr) {
  const t = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return DateTime.fromISO(`${dateStr}T${t}`, { zone: IST_ZONE }).toUTC().toJSDate();
}

/** Current instant as a UTC JS Date. */
export function nowUtc() {
  return DateTime.utc().toJSDate();
}

/** Today's IST calendar date as 'yyyy-MM-dd'. */
export function istToday() {
  return DateTime.now().setZone(IST_ZONE).toFormat("yyyy-MM-dd");
}

/** Weekday of an IST date string, 0 = Sunday … 6 = Saturday (matches
 * availability_rules.weekday). Luxon's weekday is 1=Mon..7=Sun. */
export function istWeekday(dateStr) {
  const wd = DateTime.fromISO(dateStr, { zone: IST_ZONE }).weekday; // 1..7
  return wd % 7; // Sun(7)->0, Mon(1)->1 … Sat(6)->6
}

/** Format a UTC Date/ISO for display in IST. */
export function formatIst(value, fmt = "dd LLL yyyy, hh:mm a") {
  const dt =
    value instanceof Date
      ? DateTime.fromJSDate(value)
      : DateTime.fromISO(value);
  return dt.setZone(IST_ZONE).toFormat(fmt);
}

/** IST wall-clock 'HH:mm' for a UTC instant (used to label slots). */
export function istTimeLabel(value) {
  return formatIst(value, "hh:mm a");
}

/** Add minutes to a JS Date, returning a new Date. */
export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}
