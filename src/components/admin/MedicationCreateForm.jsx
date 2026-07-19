"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createMedicationOrder } from "@/app/admin/actions/medications";

const DURATIONS = [15, 30, 60];

/** Admin form to create a medication order. The doctor picks a patient, names
 * the medicines and prices each duration she medically allows — only the ticked
 * rows are submitted as `options`. Plain English, like the rest of the panel. */
export default function MedicationCreateForm({ patients }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState(
    DURATIONS.map((days) => ({ days, enabled: false, amount: "" })),
  );
  const [error, setError] = useState(null);

  function setRow(days, patch) {
    setRows((rs) => rs.map((r) => (r.days === days ? { ...r, ...patch } : r)));
  }

  function submit(e) {
    e.preventDefault();
    setError(null);
    const options = rows
      .filter((r) => r.enabled && Number(r.amount) > 0)
      .map((r) => ({ days: r.days, amountInr: Number(r.amount) }));
    if (!patientId) {
      setError("Pick a patient.");
      return;
    }
    if (!title.trim()) {
      setError("Enter what the medicines are.");
      return;
    }
    if (!options.length) {
      setError("Enable at least one duration with a price.");
      return;
    }
    startTransition(async () => {
      const res = await createMedicationOrder({ patientId, title, options });
      if (!res.ok) {
        setError("Could not create the order — check the fields and try again.");
        return;
      }
      setTitle("");
      setRows(DURATIONS.map((days) => ({ days, enabled: false, amount: "" })));
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="card-warm p-4 space-y-4">
      <h2 className="font-semibold text-ink">Create a medication order</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Patient</label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(Number(e.target.value))}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.phone}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">
            Medicines (patient-visible)
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Constitutional remedy + support drops"
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
          />
        </div>
      </div>

      <div>
        <span className="block text-sm font-semibold mb-2">
          Durations &amp; prices
        </span>
        <p className="text-xs text-ink-soft mb-2">
          Tick each duration you allow for this patient and set its price. The
          patient picks one and pays for it.
        </p>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.days} className="flex items-center gap-3 text-sm">
              <label className="flex items-center gap-2 w-28">
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={(e) => setRow(r.days, { enabled: e.target.checked })}
                />
                {r.days} days
              </label>
              <div className="flex items-center gap-1">
                <span className="text-ink-soft">₹</span>
                <input
                  type="number"
                  min="1"
                  value={r.amount}
                  disabled={!r.enabled}
                  onChange={(e) => setRow(r.days, { amount: e.target.value })}
                  className="w-28 rounded-lg border border-[var(--border)] px-2 py-1 disabled:bg-cream-deep disabled:text-ink-soft"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Creating…" : "Create order"}
      </button>
    </form>
  );
}
