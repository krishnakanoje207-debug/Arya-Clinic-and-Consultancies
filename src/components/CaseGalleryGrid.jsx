"use client";

import { useEffect, useMemo, useState } from "react";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";

/** Filterable before/after grid. Items arrive pre-localized from the server
 * ({ id, condition, description, duration, before, after }). Filter chips are
 * the distinct conditions; only shown when there's more than one. Each card is
 * a compact preview that opens a modal with the full story + a larger slider. */
export default function CaseGalleryGrid({
  items,
  allLabel = "All",
  readMoreLabel = "Read full story",
  closeLabel = "Close",
}) {
  const [active, setActive] = useState(null);
  const [openCase, setOpenCase] = useState(null);

  const conditions = useMemo(
    () => Array.from(new Set(items.map((i) => i.condition).filter(Boolean))),
    [items],
  );
  const shown = active ? items.filter((i) => i.condition === active) : items;

  // Close on Escape and lock background scroll while the modal is open.
  useEffect(() => {
    if (!openCase) return;
    const onKey = (e) => e.key === "Escape" && setOpenCase(null);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [openCase]);

  return (
    <div>
      {conditions.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Chip label={allLabel} active={!active} onClick={() => setActive(null)} />
          {conditions.map((c) => (
            <Chip key={c} label={c} active={active === c} onClick={() => setActive(c)} />
          ))}
        </div>
      )}

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((c) => (
          <figure key={c.id} className="card-warm card-lift p-4 flex flex-col">
            <BeforeAfterSlider before={c.before} after={c.after} alt={c.condition} />
            <figcaption className="mt-4 flex flex-1 flex-col">
              <h3 className="font-semibold text-ink">{c.condition}</h3>
              {c.description ? (
                <p className="text-sm text-ink-soft mt-1 line-clamp-2">
                  {c.description}
                </p>
              ) : null}
              {c.duration ? (
                <p className="text-xs text-sage-deep mt-2">{c.duration}</p>
              ) : null}
              <button
                type="button"
                onClick={() => setOpenCase(c)}
                className="mt-3 self-start text-sm font-semibold text-sage-deep hover:text-terracotta transition"
                aria-haspopup="dialog"
              >
                {readMoreLabel} →
              </button>
            </figcaption>
          </figure>
        ))}
      </div>

      {openCase && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={openCase.condition}
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          onClick={() => setOpenCase(null)}
        >
          <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" aria-hidden="true" />
          <div
            className="relative z-10 my-auto w-full max-w-2xl card-warm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpenCase(null)}
              aria-label={closeLabel}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-cream-deep text-ink-soft hover:text-ink flex items-center justify-center"
            >
              ✕
            </button>
            <BeforeAfterSlider
              before={openCase.before}
              after={openCase.after}
              alt={openCase.condition}
            />
            <h3 className="mt-5 font-display text-2xl text-sage-deep font-semibold">
              {openCase.condition}
            </h3>
            {openCase.duration ? (
              <p className="mt-1 text-sm text-sage-deep">{openCase.duration}</p>
            ) : null}
            {openCase.description ? (
              <p className="mt-3 text-ink-soft leading-relaxed whitespace-pre-line">
                {openCase.description}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm border transition ${
        active
          ? "bg-sage text-white border-sage"
          : "border-[var(--border)] text-ink-soft hover:border-sage"
      }`}
    >
      {label}
    </button>
  );
}
