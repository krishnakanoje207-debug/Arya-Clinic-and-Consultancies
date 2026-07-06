"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions/auth";

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="block text-sm font-semibold text-ink mb-1">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="block text-sm font-semibold text-ink mb-1">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
        />
      </label>
      {state?.error && (
        <p className="text-sm text-terracotta-deep">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
