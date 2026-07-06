"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";

/** English ⇄ Hindi UI toggle. Writes a cookie via a server action and
 * refreshes so next-intl re-reads the locale. */
export default function LanguageToggle() {
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  function choose(next) {
    if (next === locale) return;
    startTransition(() => setLocale(next));
  }

  return (
    <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-white/70 text-sm">
      <button
        type="button"
        onClick={() => choose("en")}
        disabled={pending}
        className={`px-3 py-1 rounded-full ${
          locale === "en" ? "bg-sage text-white" : "text-ink-soft"
        }`}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => choose("hi")}
        disabled={pending}
        className={`px-3 py-1 rounded-full ${
          locale === "hi" ? "bg-sage text-white" : "text-ink-soft"
        }`}
        aria-pressed={locale === "hi"}
      >
        हिं
      </button>
    </div>
  );
}
