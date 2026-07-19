"use client";

import { useState, useTransition } from "react";
import {
  getScarcityDay,
  toggleFilledSlot,
} from "@/app/admin/actions/availability";

const input = "w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm";

/**
 * "Filled slots" manager: pick a service + mode + date, load that day's slot
 * grid, and click open/filled slots to toggle a deliberate "Booked" mark
 * (create/delete a filled_slots row). Genuinely booked slots are shown but not
 * clickable. Both real and admin-marked slots read the same to patients.
 */
export default function FilledSlotsManager({ services }) {
  const bookable = services.filter((s) => s.active !== false);
  const [serviceId, setServiceId] = useState(bookable[0]?.id || "");
  const [mode, setMode] = useState("online");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function load() {
    if (!serviceId || !date) {
      setNote("Pick a service and a date first.");
      return;
    }
    setNote("");
    startTransition(async () => {
      const res = await getScarcityDay(serviceId, mode, date);
      setSlots(res.slots || []);
    });
  }

  function toggle(slot) {
    if (slot.booked || slot.past) return;
    startTransition(async () => {
      const res = await toggleFilledSlot(slot.startAt, slot.endAt);
      if (!res.ok) {
        setNote(
          res.reason === "booked"
            ? "That slot has a real booking — it can't be marked."
            : "Could not update that slot.",
        );
        return;
      }
      setNote("");
      setSlots((prev) =>
        prev.map((s) =>
          s.startAt === slot.startAt ? { ...s, filled: res.filled } : s,
        ),
      );
    });
  }

  function slotClass(s) {
    if (s.booked) return "border-[var(--border)] bg-cream-deep text-ink-soft/60 cursor-not-allowed";
    if (s.filled) return "border-terracotta bg-terracotta text-white";
    if (s.past) return "border-[var(--border)] text-ink-soft/40 line-through cursor-not-allowed";
    return "border-[var(--border)] text-ink hover:border-sage";
  }

  return (
    <div className="card-warm p-6">
      <h2 className="font-semibold text-ink mb-1">Filled slots (deliberate scarcity)</h2>
      <p className="text-sm text-ink-soft mb-4">
        Mark open slots as &ldquo;Booked&rdquo; on the public site without a real
        appointment. Patients see marked slots exactly like genuinely booked
        ones. Genuinely booked slots can&apos;t be changed here.
      </p>

      <div className="grid gap-3 sm:grid-cols-4">
        <label className="block">
          <span className="block text-sm font-semibold mb-1">Service</span>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(Number(e.target.value))}
            className={input}
          >
            {bookable.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-semibold mb-1">Mode</span>
          <select value={mode} onChange={(e) => setMode(e.target.value)} className={input}>
            <option value="online">Online</option>
            <option value="clinic">Clinic</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-semibold mb-1">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={input}
          />
        </label>
        <div className="flex items-end">
          <button type="button" onClick={load} disabled={pending} className="btn-primary">
            {pending ? "Loading…" : "Load slots"}
          </button>
        </div>
      </div>

      {note && <p className="mt-3 text-sm text-terracotta-deep">{note}</p>}

      {slots !== null && (
        <div className="mt-5">
          {slots.length ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {slots.map((s) => (
                  <button
                    key={s.startAt}
                    type="button"
                    onClick={() => toggle(s)}
                    disabled={pending || s.booked || s.past}
                    className={`px-2 py-2 rounded-lg border text-sm ${slotClass(s)}`}
                  >
                    {s.label}
                    {s.booked && <span className="block text-[10px]">booked</span>}
                    {s.filled && <span className="block text-[10px]">marked</span>}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-soft">
                Grey = open · <span className="text-terracotta-deep">Terracotta</span> = marked filled ·
                Faded = genuinely booked or past. Click an open slot to mark it
                as booked; click a marked slot again to unmark it.
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-soft">No slots generated for this day.</p>
          )}
        </div>
      )}
    </div>
  );
}
