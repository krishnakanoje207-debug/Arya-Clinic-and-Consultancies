"use client";

/** Opens the browser's print dialog — "Save as PDF" lives there on phones and
 * desktops alike, so no PDF library is needed. Hidden when printing. */
export default function PrintButton({ label }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary no-print">
      {label}
    </button>
  );
}
