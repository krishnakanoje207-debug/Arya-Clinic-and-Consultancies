"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitIntakeAction } from "@/app/actions/booking";

const FIELDS = [
  "chiefComplaint",
  "duration",
  "better",
  "worse",
  "history",
  "medications",
  "lifestyle",
];

/** Optional pre-consultation form on the patient dashboard, one per upcoming
 * appointment that has no answers yet. It used to sit on the post-payment
 * screen, which now forwards straight to the dashboard. Collapsed by default. */
export default function IntakeForm({ manageToken }) {
  const t = useTranslations();
  const [answers, setAnswers] = useState({});
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(e) {
    e.preventDefault();
    setFailed(false);
    startTransition(async () => {
      const res = await submitIntakeAction(manageToken, answers);
      if (res?.ok) setSaved(true);
      else setFailed(true);
    });
  }

  if (saved) {
    return (
      <p className="text-sm text-sage-deep border-t border-[var(--border)] pt-3">
        ✓ {t("patientDashboard.intakeSaved")}
      </p>
    );
  }

  return (
    <details className="border-t border-[var(--border)] pt-3">
      <summary className="cursor-pointer text-sm font-semibold text-sage-deep min-h-11 flex items-center">
        {t("booking.intakeTitle")}
      </summary>
      <form onSubmit={save} className="space-y-3 pt-2">
        <p className="text-sm text-ink-soft">{t("booking.intakeBody")}</p>
        {FIELDS.map((f) => (
          <div key={f}>
            <label className="block text-sm text-ink mb-1">{t(`intake.${f}`)}</label>
            <textarea
              rows={2}
              value={answers[f] || ""}
              onChange={(e) => setAnswers({ ...answers, [f]: e.target.value })}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            />
          </div>
        ))}
        {failed && <p className="text-sm text-terracotta-deep">{t("common.error")}</p>}
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? t("common.loading") : t("booking.intakeSubmit")}
        </button>
      </form>
    </details>
  );
}
