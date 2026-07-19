"use client";

import { useState, useTransition } from "react";
import { regeneratePatientLink } from "@/app/admin/actions/patients";

/** One patient row: copy the private dashboard link, or regenerate it (which
 * invalidates the old link). `dashboardUrl` is the full absolute link built
 * server-side from NEXT_PUBLIC_SITE_URL. */
export default function PatientRow({
  patient,
  dashboardUrl,
  apptCount,
  lastLabel,
}) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(dashboardUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function regenerate() {
    if (!confirm("Regenerate this patient's dashboard link? The old link stops working.")) {
      return;
    }
    startTransition(() => regeneratePatientLink(patient.id));
  }

  return (
    <tr className="border-t border-[var(--border)] text-sm align-top">
      <td className="p-3 font-semibold">{patient.name}</td>
      <td className="p-3">
        <a href={`tel:${patient.phone}`} className="text-sage-deep hover:text-terracotta">
          {patient.phone}
        </a>
      </td>
      <td className="p-3 text-ink-soft break-all">{patient.email || "—"}</td>
      <td className="p-3 text-ink-soft">{apptCount}</td>
      <td className="p-3 text-ink-soft whitespace-nowrap">{lastLabel}</td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <code className="bg-cream-deep px-2 py-1 rounded text-xs max-w-[16rem] truncate">
            {dashboardUrl}
          </code>
          <button type="button" onClick={copy} className="btn-ghost text-xs py-1 px-3">
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={regenerate}
            disabled={pending}
            className="text-xs py-1 px-3 text-red-600 hover:underline"
          >
            Regenerate
          </button>
        </div>
      </td>
    </tr>
  );
}
