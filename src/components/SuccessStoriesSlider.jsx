"use client";

import { useRef, useState } from "react";
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

  // Swipe the quote panel sideways for the next/previous story. Only the
  // panel listens — the photo's before/after reveal is itself a sideways drag.
  // A mostly-vertical gesture is a page scroll and is left alone.
  const touch = useRef(null);
  const onTouchStart = (e) => {
    const p = e.touches[0];
    touch.current = { x: p.clientX, y: p.clientY };
  };
  const onTouchEnd = (e) => {
    const start = touch.current;
    touch.current = null;
    if (!start || n < 2) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - start.x;
    const dy = p.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  };

  const rows = [
    [labels.condition, c.condition],
    [labels.duration, c.duration],
    [labels.city, c.city],
  ].filter(([, v]) => v);

  const longDesc = (c.description || "").length > 180;

  return (
    <div className="grid gap-4 md:gap-8 md:grid-cols-2 items-start">
      {/* Left — before / after */}
      <div>
        <BeforeAfterSlider before={c.before} after={c.after} alt={c.condition} />
        <p className="mt-2 text-xs text-ink-soft">{labels.realImages}</p>
      </div>

      {/* Right — quote panel (tighter on phones) */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="card-warm p-5 md:p-7 flex flex-col relative"
      >
        <span
          aria-hidden="true"
          className="font-display text-4xl md:text-6xl leading-none text-gold/70 select-none"
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
          <div className="mt-4 md:mt-6 flex justify-end gap-3">
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
