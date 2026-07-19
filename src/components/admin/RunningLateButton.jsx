"use client";

import { useState, useTransition } from "react";
import { runningLate } from "@/app/admin/actions/appointments";

/** "Running late?" control for the queue header. One tap shifts ALL of today's
 * still-confirmed appointments later by +15/+30/+45 minutes (order preserved),
 * behind a confirm step. Shows pending + result feedback. */
export default function RunningLateButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState(null);

  function shift(minutes) {
    if (
      !confirm(
        `Running late — shift ALL of today's confirmed appointments ${minutes} minutes later? Each patient keeps their place in line and is notified of the new time.`,
      )
    ) {
      return;
    }
    setResult(null);
    startTransition(async () => setResult(await runningLate(minutes)));
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-ink-soft">Running late?</span>
      {[15, 30, 45].map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => shift(m)}
          disabled={pending}
          className="btn-ghost text-xs py-1 px-3"
        >
          +{m}m
        </button>
      ))}
      {pending && <span className="text-xs text-ink-soft">Shifting…</span>}
      {!pending && result?.ok && (
        <span className="text-xs text-sage-deep">
          Shifted {result.count} appointment{result.count === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}
