/**
 * Pure schedule arithmetic shared by the booking engine (server) and the
 * admin availability calendar (browser) — no database or Node imports here,
 * so both sides compute the same hours from the same rules and overrides.
 */

/** 'HH:mm[:ss]' → minutes since midnight. */
export function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Subtract blocked [start,end) ranges from a base [start,end) window,
 * returning the surviving sub-windows (all in minutes-since-midnight). */
export function subtractRanges(windowStart, windowEnd, blocked) {
  let pieces = [[windowStart, windowEnd]];
  for (const [bs, be] of blocked) {
    const next = [];
    for (const [ps, pe] of pieces) {
      if (be <= ps || bs >= pe) {
        next.push([ps, pe]); // no overlap
        continue;
      }
      if (bs > ps) next.push([ps, Math.min(bs, pe)]);
      if (be < pe) next.push([Math.max(be, ps), pe]);
    }
    pieces = next;
  }
  return pieces.filter(([s, e]) => e > s);
}

/**
 * The bookable [start,end) windows (IST minutes) for one date, before any
 * bookings are considered. Base hours are the weekday's open rules — or, when
 * the date carries "only" overrides ("available only these hours"), just
 * those, replacing the weekly hours for that day. "extra" overrides add to the
 * base; partial "blocked" overrides and recurring weekly breaks are carved out
 * of it. A whole-day block closes the day outright.
 *
 * Shared by the public calendar and the admin filled-slots grid so the two can
 * never disagree about which hours exist (they had: the admin grid used break
 * rules as open hours).
 */
export function dayWindows(wd, rules, dayOverrides) {
  if (dayOverrides.some((o) => o.kind === "blocked" && !o.startTime)) return [];
  const range = (x) => [timeToMinutes(x.startTime), timeToMinutes(x.endTime)];
  const timed = (kind) =>
    dayOverrides.filter((o) => o.kind === kind && o.startTime && o.endTime);

  const only = timed("only");
  const base = only.length
    ? only.map(range)
    : rules.filter((r) => r.kind !== "break" && r.weekday === wd).map(range);
  const windows = [...base, ...timed("extra").map(range)];
  const carved = [
    ...timed("blocked").map(range),
    ...rules.filter((r) => r.kind === "break" && r.weekday === wd).map(range),
  ];
  return windows.flatMap(([ws, we]) => subtractRanges(ws, we, carved));
}
