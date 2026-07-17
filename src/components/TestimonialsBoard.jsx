"use client";

import { useMemo, useState } from "react";

/** Written + video testimonials with condition filter chips. Items arrive
 * pre-localized from the server ({ id, name, text, rating, photo, condition,
 * videoUrl }). Chips mirror CaseGalleryGrid's pattern (only shown when there's
 * more than one condition). YouTube videoUrls render as a lazy embed
 * (thumbnail → iframe on click, no deps); other URLs render as a plain link. */
export default function TestimonialsBoard({
  items,
  allLabel = "All",
  watchLabel = "Watch video",
}) {
  const [active, setActive] = useState(null);

  const conditions = useMemo(
    () => Array.from(new Set(items.map((i) => i.condition).filter(Boolean))),
    [items],
  );
  const shown = active
    ? items.filter((i) => i.condition === active)
    : items;

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

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((tm) => {
          const yt = ytId(tm.videoUrl);
          return (
            <blockquote key={tm.id} className="card-warm card-lift p-6 flex flex-col">
              {yt ? (
                <YouTubeEmbed id={yt} title={tm.name} playLabel={watchLabel} />
              ) : null}
              {tm.rating ? <Stars n={tm.rating} /> : null}
              {tm.text ? (
                <p className="mt-3 text-ink-soft italic">“{tm.text}”</p>
              ) : null}
              {!yt && tm.videoUrl ? (
                <a
                  href={tm.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 self-start text-sm font-semibold text-sage-deep hover:text-terracotta transition"
                >
                  {watchLabel} →
                </a>
              ) : null}
              <footer className="mt-4 text-sm font-semibold text-ink">
                — {tm.name}
                {tm.condition ? (
                  <span className="ml-2 font-normal text-sage-deep">· {tm.condition}</span>
                ) : null}
              </footer>
            </blockquote>
          );
        })}
      </div>
    </div>
  );
}

/** Extract the 11-char YouTube id from watch / youtu.be / embed / shorts URLs. */
function ytId(url) {
  if (!url) return null;
  const m = String(url).match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  );
  return m ? m[1] : null;
}

function YouTubeEmbed({ id, title, playLabel }) {
  const [play, setPlay] = useState(false);

  if (play) {
    return (
      <div className="relative mb-3 aspect-video overflow-hidden rounded-xl">
        <iframe
          src={`https://www.youtube.com/embed/${id}?autoplay=1`}
          title={title || "Video testimonial"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlay(true)}
      aria-label={playLabel}
      className="group relative mb-3 block aspect-video w-full overflow-hidden rounded-xl bg-ink/10"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-terracotta text-white shadow-lg transition-transform group-hover:scale-110">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </button>
  );
}

function Stars({ n }) {
  const count = Math.max(0, Math.min(5, n || 0));
  return (
    <span className="text-terracotta" aria-label={`${count} out of 5`}>
      {"★".repeat(count)}
      <span className="text-sage-soft">{"★".repeat(5 - count)}</span>
    </span>
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
