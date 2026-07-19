"use client";

import { useState, useTransition } from "react";
import {
  cancelAppointment,
  clearReview,
  confirmAppointment,
  markAppointmentCompleted,
  saveDoctorNotes,
} from "@/app/admin/actions/appointments";

const STATUS_STYLE = {
  pending_payment: "bg-amber-100 text-amber-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-sage-soft text-sage-deep",
  cancelled: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
};

export default function AppointmentRow({ appt, serviceTitle, whenLabel }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [meetingLink, setMeetingLink] = useState(appt.meetingLink || "");
  const [notes, setNotes] = useState(appt.doctorNotes || "");

  function run(fn) {
    startTransition(async () => {
      const res = await fn();
      // Restoring a paid-but-expired booking can lose the race for the
      // slot (exclusion constraint) — guide the doctor to reschedule.
      if (res && res.ok === false && res.reason === "slot_taken") {
        alert(
          "That slot has since been booked by another patient. " +
            "Offer this patient a new time (share their manage link to rebook) or a refund.",
        );
      }
    });
  }

  return (
    <>
      <tr className="border-t border-[var(--border)] align-top">
        <td className="p-3">
          <button
            onClick={() => setOpen((o) => !o)}
            className="font-semibold text-left hover:text-sage-deep"
          >
            {appt.patientName}
          </button>
          <div className="text-xs text-ink-soft">{appt.patientPhone}</div>
          {appt.needsReview && (
            <span className="inline-block mt-1 text-[10px] bg-terracotta text-white px-2 py-0.5 rounded-full">
              paid, hold expired
            </span>
          )}
        </td>
        <td className="p-3 text-sm">{serviceTitle}</td>
        <td className="p-3 text-sm whitespace-nowrap">{whenLabel}</td>
        <td className="p-3 text-sm">
          {appt.mode === "online" ? "Online" : "Clinic"}
        </td>
        <td className="p-3">
          <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[appt.status]}`}>
            {appt.status.replace("_", " ")}
          </span>
          {appt.razorpayPaymentId && (
            <div className="text-[11px] text-ink-soft mt-1 break-all">
              Payment: {appt.razorpayPaymentId}
            </div>
          )}
          {appt.razorpayRefundId && (
            <div className="text-[11px] text-terracotta-deep mt-1 break-all">
              Refunded: {appt.razorpayRefundId}
            </div>
          )}
          {appt.razorpayOrderId && (
            <div className="text-[11px] text-ink-soft/70 mt-1 break-all">
              Order: {appt.razorpayOrderId}
            </div>
          )}
        </td>
        <td className="p-3 text-right space-x-1 whitespace-nowrap">
          {appt.status !== "confirmed" && appt.status !== "completed" && (
            <button
              onClick={() => run(() => confirmAppointment(appt.id, meetingLink))}
              disabled={pending}
              className="btn-primary text-xs py-1 px-3"
            >
              Confirm
            </button>
          )}
          {appt.status === "confirmed" && (
            <button
              onClick={() => run(() => markAppointmentCompleted(appt.id))}
              disabled={pending}
              className="btn-ghost text-xs py-1 px-3"
            >
              Mark completed
            </button>
          )}
          {appt.needsReview && (
            <button
              onClick={() => run(() => clearReview(appt.id))}
              disabled={pending}
              className="btn-ghost text-xs py-1 px-3"
            >
              Clear flag
            </button>
          )}
          {appt.status !== "cancelled" && appt.status !== "completed" && (
            <button
              onClick={() => run(() => cancelAppointment(appt.id))}
              disabled={pending}
              className="text-xs py-1 px-3 text-red-600 hover:underline"
            >
              Cancel
            </button>
          )}
        </td>
      </tr>
      {open && (
        <tr className="bg-cream-deep">
          <td colSpan={6} className="p-4">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block font-semibold mb-1">
                  Video meeting link
                </label>
                <input
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/…"
                  className="w-full rounded border border-[var(--border)] px-2 py-1"
                />
                <p className="text-xs text-ink-soft mt-1">
                  Included in confirmation &amp; reminder messages.
                </p>

                <label className="block font-semibold mb-1 mt-4">
                  Private consultation notes
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded border border-[var(--border)] px-2 py-1"
                />
                <button
                  onClick={() => run(() => saveDoctorNotes(appt.id, notes))}
                  disabled={pending}
                  className="btn-ghost text-xs py-1 px-3 mt-2"
                >
                  Save notes
                </button>
              </div>
              <div>
                <p className="font-semibold mb-1">Problem described at booking</p>
                {appt.problemNote ? (
                  <p className="mb-3">{appt.problemNote}</p>
                ) : (
                  <p className="text-ink-soft mb-3">Not provided.</p>
                )}
                <p className="font-semibold mb-1">Pre-consultation intake</p>
                {appt.intakeAnswers ? (
                  <dl className="space-y-1">
                    {Object.entries(appt.intakeAnswers).map(([k, v]) =>
                      v ? (
                        <div key={k}>
                          <dt className="text-xs uppercase text-ink-soft">{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ) : null,
                    )}
                  </dl>
                ) : (
                  <p className="text-ink-soft">Not filled.</p>
                )}
                {appt.patientEmail && (
                  <p className="mt-3 text-xs text-ink-soft">
                    Email: {appt.patientEmail}
                  </p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
