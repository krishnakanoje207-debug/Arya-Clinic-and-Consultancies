"use client";

import { useEffect, useState, useTransition } from "react";
import {
  markAppointmentCompleted,
  saveConsultationRecord,
} from "@/app/admin/actions/appointments";

const input = "w-full rounded border border-[var(--border)] px-2 py-1 text-sm";

/** Today's IST date as 'yyyy-MM-dd' (the date input's minimum). */
function istTodayStr() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

const draftKey = (id) => `arya.consult.${id}`;

function readDraft(id) {
  try {
    return JSON.parse(localStorage.getItem(draftKey(id)) || "null");
  } catch {
    return null;
  }
}

/** "Join meeting" for an online consult: opens the Meet link in a new tab.
 * Clinic visits have no link; an online consult without one says so. */
export function JoinMeetingButton({ appt }) {
  if (appt.mode !== "online") {
    return <span className="text-xs text-ink-soft self-center">In clinic</span>;
  }
  if (!appt.meetingLink) {
    return (
      <button
        type="button"
        disabled
        title="No meeting link yet — add one under Appointments."
        className="btn-ghost text-xs py-1 px-3 opacity-50"
      >
        No meeting link
      </button>
    );
  }
  return (
    <a
      href={appt.meetingLink}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-ghost text-xs py-1 px-3"
    >
      Join meeting
    </a>
  );
}

/**
 * The consultation record. mode="complete" (a confirmed consult, opened by
 * "Start consultation") saves the record AND marks the appointment completed;
 * mode="edit" corrects the record of an already-completed one. While a consult
 * is in progress the typed text is kept as a browser draft, so a refresh
 * mid-consultation loses nothing.
 */
export default function ConsultationForm({ appt, mode = "complete", onDone }) {
  const completing = mode === "complete";
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(() => {
    const fromRow = {
      reportedSymptoms: appt.reportedSymptoms || "",
      medicinesPrescribed: appt.medicinesPrescribed || "",
      nextAppointmentOn: appt.nextAppointmentOn || "",
    };
    return (completing && readDraft(appt.id)) || fromRow;
  });

  useEffect(() => {
    if (!completing) return;
    try {
      localStorage.setItem(draftKey(appt.id), JSON.stringify(form));
    } catch {}
  }, [completing, appt.id, form]);

  const set = (k) => (e) => {
    setSaved(false);
    setError(null);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = completing
        ? await markAppointmentCompleted(appt.id, form)
        : await saveConsultationRecord(appt.id, form);
      if (res?.ok === false) {
        setError(
          {
            invalid: "Check the next appointment date.",
            past_date: "The next appointment date is in the past.",
          }[res.reason] || "This appointment's status has changed — refresh the page.",
        );
        return;
      }
      if (completing) {
        try {
          localStorage.removeItem(draftKey(appt.id));
        } catch {}
      } else {
        setSaved(true);
      }
      onDone?.();
    });
  }

  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        <span className="block font-semibold mb-1">Reported symptoms</span>
        <textarea
          rows={3}
          value={form.reportedSymptoms}
          onChange={set("reportedSymptoms")}
          className={input}
        />
      </label>
      <label className="block">
        <span className="block font-semibold mb-1">Medicines prescribed</span>
        <textarea
          rows={3}
          value={form.medicinesPrescribed}
          onChange={set("medicinesPrescribed")}
          className={input}
        />
      </label>
      <label className="block">
        <span className="block font-semibold mb-1">Next appointment date</span>
        <input
          type="date"
          value={form.nextAppointmentOn}
          min={completing ? istTodayStr() : undefined}
          onChange={set("nextAppointmentOn")}
          className="rounded border border-[var(--border)] px-2 py-1"
        />
        <span className="block text-xs text-ink-soft mt-1">
          Shown to the patient on their dashboard and on their medication orders.
        </span>
      </label>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="btn-primary text-xs py-1 px-3"
        >
          {pending ? "Saving…" : completing ? "Mark completed" : "Save record"}
        </button>
        {saved && <span className="text-xs text-sage-deep">Saved.</span>}
        {error && <span className="text-xs text-terracotta-deep">{error}</span>}
      </div>
      <p className="text-xs text-ink-soft">
        {completing
          ? "Saved with the appointment and added to your Google Sheet."
          : "Changes here update the patient's dashboard and the CSV download; the Google Sheet row written at completion stays as it was."}
      </p>
    </div>
  );
}
