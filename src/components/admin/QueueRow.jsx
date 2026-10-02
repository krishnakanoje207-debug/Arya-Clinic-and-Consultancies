"use client";

import { useState } from "react";
import ConsultationForm, { JoinMeetingButton } from "@/components/admin/ConsultationForm";

function snippet(text, n = 80) {
  if (!text) return "";
  const s = String(text).trim();
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

/** One queue row. Actionable rows offer "Join meeting" and "Start
 * consultation"; the latter opens the consultation record beneath the row,
 * whose "Mark completed" finishes the appointment. */
export default function QueueRow({ appt, serviceTitle, whenLabel, actionable }) {
  const [consulting, setConsulting] = useState(false);
  return (
    <>
      <tr className="border-t border-[var(--border)] align-top">
        <td className="p-3">
          <div className="font-semibold">{appt.patientName}</div>
          <div className="text-xs text-ink-soft">{appt.patientPhone}</div>
        </td>
        <td className="p-3">{serviceTitle}</td>
        <td className="p-3 whitespace-nowrap">{whenLabel}</td>
        <td className="p-3 text-ink-soft">{snippet(appt.problemNote)}</td>
        {actionable && (
          <td className="p-3">
            <div className="flex justify-end gap-2 flex-wrap">
              <JoinMeetingButton appt={appt} />
              <button
                type="button"
                onClick={() => setConsulting((c) => !c)}
                className="btn-primary text-xs py-1 px-3"
              >
                {consulting ? "Hide consultation" : "Start consultation"}
              </button>
            </div>
          </td>
        )}
      </tr>
      {actionable && consulting && (
        <tr className="bg-cream-deep">
          <td colSpan={5} className="p-4">
            <ConsultationForm appt={appt} onDone={() => setConsulting(false)} />
          </td>
        </tr>
      )}
    </>
  );
}
