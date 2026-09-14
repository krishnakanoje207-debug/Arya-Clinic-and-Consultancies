"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { submitPatientReview } from "@/app/actions/review";

/**
 * Patient-facing "share your experience" form on the dashboard. Collects a
 * display name (prefilled, may be initials for privacy), a 1–5 star rating, the
 * review text and an explicit publish-consent checkbox, then calls the review
 * server action. The submission lands as an UNPUBLISHED testimonials row — the
 * doctor moderates/publishes it — so on success we show a thank-you note rather
 * than the review itself. Error results from the action are surfaced inline.
 *
 * @param {object} props
 * @param {string} props.token           patient's private dashboard token
 * @param {string} props.defaultName      prefilled display name (patient's name)
 * @param {boolean} props.alreadySubmitted patient already has a review on file
 */
export default function ReviewForm({ token, defaultName, alreadySubmitted }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  if (alreadySubmitted || done) {
    return (
      <div className="card-warm p-5">
        <p className="text-sm text-sage-deep">{t("review.thankYou")}</p>
      </div>
    );
  }

  function submit(e) {
    e.preventDefault();
    setError(null);
    if (!rating) {
      setError(t("review.ratingRequired"));
      return;
    }
    const formData = new FormData(e.currentTarget);
    formData.set("token", token);
    formData.set("rating", String(rating));
    startTransition(async () => {
      const res = await submitPatientReview(formData);
      if (!res.ok) {
        const key = `review.errors.${res.reason}`;
        setError(t.has(key) ? t(key) : t("review.errors.generic"));
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="card-warm p-5 space-y-4">
      <p className="text-sm text-ink-soft">{t("review.intro")}</p>

      <div>
        <label className="block text-sm font-semibold text-ink mb-1">
          {t("review.nameLabel")}
        </label>
        <input
          required
          name="displayName"
          defaultValue={defaultName || ""}
          maxLength={80}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
        />
        <p className="mt-1 text-xs text-ink-soft">{t("review.nameHint")}</p>
      </div>

      <div>
        <span className="block text-sm font-semibold text-ink mb-2">
          {t("review.ratingLabel")}
        </span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={t("review.starLabel", { n })}
              aria-pressed={rating >= n}
              className={`text-2xl leading-none ${
                rating >= n ? "text-gold" : "text-ink-soft/40"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-1">
          {t("review.textLabel")}
        </label>
        <textarea
          required
          name="text"
          rows={4}
          minLength={20}
          maxLength={1500}
          placeholder={t("review.textPlaceholder")}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-ink">
        <input
          required
          type="checkbox"
          name="consent"
          className="mt-1 shrink-0"
        />
        <span>{t("review.consent")}</span>
      </label>

      {error && <p role="alert" className="text-sm text-terracotta-deep">{error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? t("common.loading") : t("review.submit")}
      </button>
    </form>
  );
}
