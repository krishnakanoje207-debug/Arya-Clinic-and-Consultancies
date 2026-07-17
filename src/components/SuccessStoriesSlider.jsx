"use client";

import { useState } from "react";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";

/**
 * Featured success-story slider (v2.1). One case at a time, two columns:
 * a large before/after reveal on the left, a quote panel with label-value
 * rows + description on the right, and round prev/next arrows that cycle the
 * published cases. Items arrive pre-localized from the server.
 *
 * items: [{ id, condition, description, duration, city, before, after }]
 * labels: { condition, duration, city, readMore, readLess, prev, next, realImages }
 */
export default function SuccessStoriesSlider({ items, labels }) {
  const [i, setI] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const n = items.length;
  const c = items[i];

  const go = (delta) => {
    setExpanded(false);
    setI((cur) => (cur + delta + n) % n);
  };

  const rows = [
    [labels.condition, c.condition],
    [labels.duration, c.duration],
    [labels.city, c.city],
  ].filter(([, v]) => v);

  const longDesc = (c.description || "").length > 180;

  return (
    <div className="grid gap-8 md:grid-cols-2 items-start">
      {/* Left — before / after */}
      <div>
        <BeforeAfterSlider before={c.before} after={c.after} alt={c.condition} />
        <p className="mt-2 text-xs text-ink-soft">{labels.realImages}</p>
      </div>

      {/* Right — quote panel */}
      <div className="card-warm p-7 flex flex-col relative">
        <span
          aria-hidden="true"
          className="font-display text-6xl leading-none text-gold/70 select-none"
        >
          &ldquo;
        </span>

        {rows.length ? (
          <dl className="mt-2 divide-y divide-[var(--border)] text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex gap-3 py-1.5">
                <dt className="w-28 shrink-0 text-ink-soft">{label}</dt>
                <dd className="font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {c.description ? (
          <p
            className={`mt-4 text-ink-soft leading-relaxed whitespace-pre-line ${
              !expanded && longDesc ? "line-clamp-4" : ""
            }`}
          >
            {c.description}
          </p>
        ) : null}
        {longDesc ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-2 self-start text-sm font-semibold text-sage-deep hover:text-terracotta"
          >
            {expanded ? labels.readLess : `…${labels.readMore}`}
          </button>
        ) : null}

        {n > 1 ? (
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={labels.prev}
              className="h-11 w-11 rounded-full border border-sage text-sage-deep hover:bg-sage-soft flex items-center justify-center transition"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={labels.next}
              className="h-11 w-11 rounded-full bg-sage-deep text-cream hover:bg-sage flex items-center justify-center transition"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
