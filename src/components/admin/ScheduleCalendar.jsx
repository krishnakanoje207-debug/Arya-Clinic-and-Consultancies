"use client";

import { useState } from "react";
import { dayWindows } from "@/lib/schedule";
import OverridesManager from "@/components/admin/OverridesManager";

const MODES = ["online", "clinic"];
const WEEKDAY_HEAD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const OVERRIDE_LABEL = {
  blocked: "Blocked",
  extra: "Extra hours",
  only: "Only these hours",
};

// Date strings are handled as UTC midnights so the browser's own timezone can
// never shift a day; every date here is an IST calendar date.
const toDate = (s) => new Date(`${s}T00:00:00Z`);
const toStr = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => toStr(new Date(toDate(s).getTime() + n * 86_400_000));
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** The hours one date really offers, per mode — the same dayWindows() the
 * booking engine uses, fed the same active rules and mode-matching overrides. */
function effectiveHours(dateStr, rules, overrides) {
  const wd = toDate(dateStr).getUTCDay();
  const out = {};
  for (const mode of MODES) {
    const modeRules = rules.filter((r) => r.active && r.mode === mode);
    const dayOverrides = overrides.filter(
      (o) => o.onDate === dateStr && (!o.mode || o.mode === mode),
    );
    const windows = dayWindows(wd, modeRules, dayOverrides);
    if (windows.length) out[mode] = windows.map(([s, e]) => `${hhmm(s)}–${hhmm(e)}`);
  }
  return out;
}

const CELL = {
  hours: "bg-sage text-white",
  none: "bg-white text-ink-soft border border-[var(--border)]",
  closed: "bg-red-200 text-red-800",
  changed: "bg-gold text-ink",
};

/**
 * Month calendar for the Availability page. Each date shows what the weekly
 * schedule plus that date's overrides actually produce: weekly hours, no
 * hours, closed by an override, or changed by an override. Clicking a date
 * shows its effective hours and puts it into the override form below, so a
 * holiday or one-off change is marked against a real date.
 */
export default function ScheduleCalendar({ rules, overrides, today, horizonDays }) {
  const [month, setMonth] = useState(today.slice(0, 7)); // 'yyyy-MM'
  const [selected, setSelected] = useState("");
  const lastBookable = addDays(today, horizonDays - 1);

  const first = `${month}-01`;
  const lead = toDate(first).getUTCDay();
  const nextMonth = toStr(new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 1))).slice(0, 7);
  const prevMonth = toStr(new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7) - 2, 1))).slice(0, 7);
  const days = [];
  for (let d = first; d.slice(0, 7) === month; d = addDays(d, 1)) days.push(d);

  function kindOf(dateStr) {
    const dayOverrides = overrides.filter((o) => o.onDate === dateStr);
    const hours = effectiveHours(dateStr, rules, overrides);
    const open = Object.keys(hours).length > 0;
    if (dayOverrides.length) return open ? "changed" : "closed";
    return open ? "hours" : "none";
  }

  const selectedOverrides = overrides.filter((o) => o.onDate === selected);
  const selectedHours = selected ? effectiveHours(selected, rules, overrides) : {};
  const monthLabel = toDate(first).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <>
      <div className="card-warm p-6">
        <h2 className="font-semibold text-ink mb-1">Calendar</h2>
        <p className="text-xs text-ink-soft mb-4">
          What your weekly schedule and date overrides give each day. Click a
          date to see its hours and mark it in the override form below.
        </p>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setMonth(prevMonth)}
                disabled={month <= today.slice(0, 7)}
                className="btn-ghost text-xs py-1 px-3 disabled:opacity-40"
                aria-label="Previous month"
              >
                ‹
              </button>
              <span className="font-semibold text-sm">{monthLabel}</span>
              <button
                type="button"
                onClick={() => setMonth(nextMonth)}
                className="btn-ghost text-xs py-1 px-3"
                aria-label="Next month"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {WEEKDAY_HEAD.map((w) => (
                <div key={w} className="text-ink-soft py-1">
                  {w}
                </div>
              ))}
              {Array.from({ length: lead }, (_, i) => (
                <div key={`lead${i}`} />
              ))}
              {days.map((d) => {
                const past = d < today;
                const kind = kindOf(d);
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={past}
                    onClick={() => setSelected(d)}
                    className={`min-h-10 rounded-lg ${CELL[kind]} ${
                      past ? "opacity-25" : d > lastBookable ? "opacity-50" : ""
                    } ${d === selected ? "ring-2 ring-sage-deep" : ""} ${
                      d === today ? "font-bold underline" : ""
                    }`}
                    aria-label={d}
                    aria-pressed={d === selected}
                  >
                    {Number(d.slice(8))}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-soft">
              <span><span className={`inline-block w-3 h-3 rounded align-middle mr-1 ${CELL.hours}`} />Weekly hours</span>
              <span><span className={`inline-block w-3 h-3 rounded align-middle mr-1 ${CELL.changed}`} />Changed by override</span>
              <span><span className={`inline-block w-3 h-3 rounded align-middle mr-1 ${CELL.closed}`} />Closed by override</span>
              <span><span className={`inline-block w-3 h-3 rounded align-middle mr-1 ${CELL.none}`} />No hours</span>
            </div>
            <p className="mt-1 text-[11px] text-ink-soft">
              Faded dates are beyond your booking window ({horizonDays} days) —
              patients can&apos;t book them yet.
            </p>
          </div>

          <div className="text-sm">
            {selected ? (
              <>
                <p className="font-semibold mb-2">
                  {toDate(selected).toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </p>
                {MODES.map((m) => (
                  <p key={m}>
                    <span className="text-ink-soft capitalize">{m}:</span>{" "}
                    {selectedHours[m]?.join(", ") || "no hours"}
                  </p>
                ))}
                {selectedOverrides.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {selectedOverrides.map((o) => (
                      <li key={o.id} className="text-xs">
                        Override: {OVERRIDE_LABEL[o.kind] || o.kind}
                        {o.startTime
                          ? ` ${o.startTime.slice(0, 5)}–${o.endTime?.slice(0, 5)}`
                          : " (whole day)"}
                        {o.mode ? ` · ${o.mode}` : ""}
                        {o.note ? ` — ${o.note}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-xs text-ink-soft">
                  This date is filled in below — choose a kind and add an
                  override to change it. Weekly hours change under Weekly
                  schedule above.
                </p>
              </>
            ) : (
              <p className="text-ink-soft">Pick a date to see its hours.</p>
            )}
          </div>
        </div>
      </div>

      <OverridesManager overrides={overrides} date={selected} onDateChange={setSelected} />
    </>
  );
}
