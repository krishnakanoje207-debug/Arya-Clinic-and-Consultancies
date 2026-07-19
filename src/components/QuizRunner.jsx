"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { scoreQuiz } from "@/lib/quiz-data";
import { submitQuizLead } from "@/app/actions/quiz";

/**
 * Tap-a-card self-assessment runner. The quiz definition arrives already
 * localized (plain strings + option scores). Scoring and the result band are
 * computed client-side for display via the shared scoreQuiz(); the server
 * recomputes them from the raw answers when a lead is saved, so the stored
 * result never trusts the browser.
 */
export default function QuizRunner({ quiz, settings }) {
  const t = useTranslations("quiz");
  const total = quiz.questions.length;

  const [answers, setAnswers] = useState(Array(total).fill(null));
  const [step, setStep] = useState(0); // 0..total-1, or total = result screen
  const isResult = step >= total;

  const choose = (optIndex) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = optIndex;
      return next;
    });
  };

  const answered = answers[step] != null;
  const lastQuestion = step === total - 1;

  const restart = () => {
    setAnswers(Array(total).fill(null));
    setStep(0);
  };

  if (!isResult) {
    const q = quiz.questions[step];
    const progress = Math.round(((step + 1) / total) * 100);
    return (
      <div className="card-warm p-6 md:p-8">
        <div className="mb-6">
          <p className="text-sm text-ink-soft mb-2">
            {t("progress", { current: step + 1, total })}
          </p>
          <div className="h-2 rounded-full bg-sage-soft overflow-hidden">
            <div
              className="h-full bg-sage transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <h2 className="font-display text-xl md:text-2xl text-ink font-semibold leading-snug">
          {q.text}
        </h2>

        <div className="mt-5 grid gap-3">
          {q.options.map((opt, i) => {
            const selected = answers[step] === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => choose(i)}
                aria-pressed={selected}
                className={`text-left rounded-2xl border p-4 transition ${
                  selected
                    ? "border-sage bg-sage-soft/60 ring-2 ring-sage"
                    : "border-[var(--border)] bg-card hover:border-sage"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                      selected ? "border-sage bg-sage" : "border-[var(--border)]"
                    }`}
                  />
                  <span className="text-ink">{opt.text}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-7 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn-ghost disabled:opacity-40 disabled:pointer-events-none"
          >
            {t("previous")}
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!answered}
            className="btn-primary disabled:opacity-40 disabled:pointer-events-none"
          >
            {lastQuestion ? t("seeResult") : t("next")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <ResultScreen quiz={quiz} answers={answers} settings={settings} onRestart={restart} />
  );
}

function ResultScreen({ quiz, answers, settings, onRestart }) {
  const t = useTranslations("quiz");
  const { resultKey, score, maxScore } = scoreQuiz(quiz, answers);
  const result = quiz.results[resultKey];

  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState(null); // "ok" | "invalid" | "unavailable"
  const [pending, startTransition] = useTransition();

  const wa = settings?.whatsapp
    ? `https://wa.me/${String(settings.whatsapp).replace(/\D/g, "")}`
    : null;

  const onSubmit = (e) => {
    e.preventDefault();
    if (!/^\+?[0-9][0-9 \-]{5,17}$/.test(phone.trim())) {
      setStatus("invalid");
      return;
    }
    startTransition(async () => {
      const res = await submitQuizLead({
        quizSlug: quiz.slug,
        phone: phone.trim(),
        answers,
      });
      setStatus(res.ok ? "ok" : res.reason === "unavailable" ? "unavailable" : "invalid");
    });
  };

  return (
    <div className="card-warm p-6 md:p-8">
      <p className="text-xs uppercase tracking-wide text-sage-deep font-semibold">
        {t("resultLabel")}
      </p>
      <h2 className="mt-2 font-display text-2xl md:text-3xl text-ink font-semibold leading-snug">
        {result.title}
      </h2>
      <p className="mt-4 text-ink-soft leading-relaxed">{result.body}</p>

      <p className="mt-4 text-sm text-ink-soft">
        {t("scoreLabel", { score, total: maxScore })}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/book" className="btn-primary">
          {t("discussCta")}
        </Link>
        <button type="button" onClick={onRestart} className="btn-ghost">
          {t("restart")}
        </button>
      </div>

      {/* Optional phone capture — the doctor's team follows up. */}
      <div className="mt-8 border-t border-[var(--border)] pt-6">
        {status === "ok" ? (
          <p className="text-sage-deep font-semibold">{t("phoneSuccess")}</p>
        ) : status === "unavailable" ? (
          <div className="text-sm text-ink-soft">
            <p>{t("phoneUnavailable")}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {wa ? (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                  {t("whatsappFallback")}
                </a>
              ) : null}
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <p className="font-semibold text-ink">{t("phoneHeading")}</p>
            <p className="mt-1 text-sm text-ink-soft">{t("phoneBody")}</p>
            <div className="mt-3 flex flex-col sm:flex-row gap-3">
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("phonePlaceholder")}
                className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2"
              />
              <button type="submit" disabled={pending} className="btn-primary">
                {pending ? t("phoneSubmitting") : t("phoneSubmit")}
              </button>
            </div>
            {status === "invalid" ? (
              <p className="mt-2 text-sm text-terracotta-deep">{t("phoneError")}</p>
            ) : null}
          </form>
        )}
      </div>

      <p className="mt-8 text-xs text-ink-soft/80 leading-relaxed">
        {t("disclaimer")}
      </p>
    </div>
  );
}
