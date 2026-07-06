"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { submitContact } from "@/app/actions/contact";

export default function ContactForm() {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(submitContact, null);

  if (state?.ok) {
    return (
      <div className="card-warm p-6 text-ink">
        <p className="font-semibold text-sage-deep">Thank you!</p>
        <p className="text-sm text-ink-soft mt-1">
          Your message has been sent. We&apos;ll get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="card-warm p-6 space-y-3">
      {/* Honeypot — hidden from users, tempting to bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <input
        name="name"
        required
        placeholder={t("booking.name")}
        className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="phone"
          placeholder={t("booking.phone")}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
        />
        <input
          name="email"
          type="email"
          placeholder={t("booking.email")}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
        />
      </div>
      <textarea
        name="message"
        required
        rows={4}
        placeholder="Message"
        className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
      />
      {state?.error ? (
        <p className="text-sm text-terracotta-deep">{state.error}</p>
      ) : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? t("common.loading") : t("common.send")}
      </button>
    </form>
  );
}
