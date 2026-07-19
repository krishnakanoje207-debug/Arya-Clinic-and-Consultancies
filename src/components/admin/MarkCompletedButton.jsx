"use client";

import { useTransition } from "react";
import { markAppointmentCompleted } from "@/app/admin/actions/appointments";

/** "Mark completed" button for a queue row (remaining/delayed). Transitions the
 * confirmed appointment to completed via the admin action. */
export default function MarkCompletedButton({ id }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => markAppointmentCompleted(id))}
      disabled={pending}
      className="btn-primary text-xs py-1 px-3"
    >
      {pending ? "Saving…" : "Mark completed"}
    </button>
  );
}
