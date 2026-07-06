"use client";

import { useState, useTransition } from "react";
import { previewArchival, runArchivalAction } from "@/app/admin/actions/archive";

/** Dashboard widget: preview how many appointments are archivable, then
 * run the export→deliver→purge with an explicit confirmation. */
export default function ArchiveTool() {
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);

  function check() {
    setResult(null);
    startTransition(async () => setPreview(await previewArchival()));
  }

  function run() {
    if (
      !confirm(
        "Archive now? Eligible appointments will be emailed to the clinic Gmail as CSV+JSON and then removed from the database (slim history rows are kept). Nothing is deleted unless the email is delivered.",
      )
    )
      return;
    startTransition(async () => {
      setResult(await runArchivalAction());
      setPreview(null);
    });
  }

  return (
    <div className="mt-4 border-t border-[var(--border)] pt-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={check} disabled={pending} className="btn-ghost text-xs py-1 px-3">
          {pending ? "…" : "Check archivable"}
        </button>
        {preview?.ok && (
          <span className="text-ink-soft">
            {preview.eligible} appointment{preview.eligible === 1 ? "" : "s"} older
            than 12 months
          </span>
        )}
        {preview?.ok && preview.eligible > 0 && (
          <button onClick={run} disabled={pending} className="btn-primary text-xs py-1 px-3">
            Archive &amp; free space
          </button>
        )}
      </div>
      {preview && !preview.ok && (
        <p className="mt-2 text-terracotta-deep">{preview.error}</p>
      )}
      {result &&
        (result.ok ? (
          <p className="mt-2 text-sage-deep">
            ✓ {result.archived} archived
            {result.driveUploaded ? " (email + Drive)" : result.archived ? " (email delivered)" : ""}
            {result.message ? ` — ${result.message}` : ""}
          </p>
        ) : (
          <p className="mt-2 text-terracotta-deep">{result.error}</p>
        ))}
    </div>
  );
}
