"use client";

import { useActionState, useRef, useTransition, useEffect } from "react";
import { deleteOverride, upsertOverride } from "@/app/admin/actions/content";

const input = "w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm";

const KIND_LABEL = {
  blocked: "Blocked",
  extra: "Extra hours",
  only: "Only these hours",
};

export default function OverridesManager({ overrides }) {
  const [state, action, pending] = useActionState(upsertOverride, null);
  const [isDeleting, startDelete] = useTransition();
  const ref = useRef(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <div className="card-warm p-6">
      <h2 className="font-semibold text-ink mb-4">Holidays &amp; date overrides</h2>

      {overrides.length ? (
        <ul className="mb-4 divide-y divide-[var(--border)] text-sm">
          {overrides.map((o) => (
            <li key={o.id} className="py-2 flex justify-between items-center">
              <span>
                <strong>{o.onDate}</strong> · {KIND_LABEL[o.kind] || o.kind}
                {o.startTime ? ` ${o.startTime}–${o.endTime}` : " (whole day)"}
                {o.mode ? ` · ${o.mode}` : ""}
                {o.note ? ` — ${o.note}` : ""}
              </span>
              <button
                onClick={() => startDelete(() => deleteOverride(o.id))}
                disabled={isDeleting}
                className="text-xs text-red-600 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-soft mb-4">No overrides.</p>
      )}

      <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-semibold mb-1">Date</span>
          <input type="date" name="onDate" className={input} required />
        </label>
        <label className="block">
          <span className="block text-sm font-semibold mb-1">Kind</span>
          <select name="kind" className={input}>
            <option value="blocked">Blocked (holiday / closed)</option>
            <option value="only">Available only these hours</option>
            <option value="extra">Extra hours</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-semibold mb-1">Start (optional)</span>
          <input type="time" name="startTime" className={input} />
        </label>
        <label className="block">
          <span className="block text-sm font-semibold mb-1">End (optional)</span>
          <input type="time" name="endTime" className={input} />
        </label>
        <label className="block">
          <span className="block text-sm font-semibold mb-1">Mode (blank = both)</span>
          <select name="mode" className={input}>
            <option value="">Both</option>
            <option value="online">Online</option>
            <option value="clinic">Clinic</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="block text-sm font-semibold mb-1">Note</span>
          <input name="note" className={input} />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Adding…" : "Add override"}
          </button>
          {state?.error && (
            <span className="ml-3 text-sm text-terracotta-deep">{state.error}</span>
          )}
        </div>
      </form>
      <p className="mt-3 text-xs text-ink-soft">
        A blocked override with no start time closes the whole day. Leave times
        empty for full-day holidays.
      </p>
      <p className="mt-1 text-xs text-ink-soft">
        <strong>Available only these hours</strong>: for a day you can give only
        part of your time. Enter the start and end — that day offers just this
        window instead of your weekly hours. Add another row for a second window
        on the same day. Your breaks and the gap between consultations still
        apply.
      </p>
    </div>
  );
}
