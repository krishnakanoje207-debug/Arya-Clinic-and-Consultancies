"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { cancelByToken } from "@/app/actions/manage";

export default function ManageActions({ token }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState(null);

  function cancel() {
    if (!confirm("Cancel this appointment?")) return;
    startTransition(async () => {
      const res = await cancelByToken(token);
      setState(res.ok ? "cancelled" : "error");
    });
  }

  if (state === "cancelled") {
    return (
      <p className="text-sage-deep font-semibold">
        Your appointment has been cancelled.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Link href={`/book?reschedule=${token}`} className="btn-ghost">
        Reschedule (pick a new time)
      </Link>
      <button type="button" onClick={cancel} disabled={pending} className="btn-primary">
        {pending ? "…" : "Cancel appointment"}
      </button>
      {state === "error" && (
        <p className="text-sm text-terracotta-deep w-full">
          This appointment can no longer be cancelled online. Please contact the
          clinic.
        </p>
      )}
    </div>
  );
}
