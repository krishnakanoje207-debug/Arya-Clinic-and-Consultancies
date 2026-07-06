"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/admin/actions/auth";

const input = "w-full rounded-lg border border-[var(--border)] px-3 py-2";

export default function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, null);

  return (
    <form action={action} className="card-warm p-6 space-y-3">
      <label className="block">
        <span className="block text-sm font-semibold mb-1">Current password</span>
        <input name="current" type="password" required autoComplete="current-password" className={input} />
      </label>
      <label className="block">
        <span className="block text-sm font-semibold mb-1">New password (min 8 chars)</span>
        <input name="next" type="password" required minLength={8} autoComplete="new-password" className={input} />
      </label>
      <label className="block">
        <span className="block text-sm font-semibold mb-1">Confirm new password</span>
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={input} />
      </label>
      {state?.error && <p className="text-sm text-terracotta-deep">{state.error}</p>}
      {state?.ok && <p className="text-sm text-sage-deep">✓ Password changed.</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
