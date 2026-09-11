"use client";

import { useState } from "react";

/* Plain <img> (not next/image): case photos may be hosted anywhere the
 * admin pastes, and next/image would crash on non-allowlisted hosts.
 * eslint-disable-next-line kept per element below. */

/** Draggable before/after reveal. Falls back gracefully if an image is
 * missing (shows whichever exists). */
export default function BeforeAfterSlider({ before, after, alt }) {
  const [pos, setPos] = useState(50);

  if (!before || !after) {
    const only = before || after;
    return (
      <div className="aspect-[4/3] rounded-xl overflow-hidden bg-sage-soft">
        {only ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={only} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-sage-deep/50 text-sm">
            Before / after
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] rounded-xl overflow-hidden select-none bg-sage-soft">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={`${alt} — after`} className="absolute inset-0 h-full w-full object-cover" />
      {/* Before image is full-size and revealed by clipping its right edge,
          so it always stays pixel-aligned with the after image behind. */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={`${alt} — before`} className="absolute inset-0 h-full w-full object-cover" />
      </div>
      <div className="absolute inset-y-0" style={{ left: `calc(${pos}% - 1px)` }}>
        <div className="h-full w-0.5 bg-white/80" />
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Reveal before and after"
        className="slider-touch absolute inset-x-0 bottom-1 mx-auto h-11 w-[85%] cursor-pointer"
      />
      <div className="absolute top-2 left-2 text-[10px] uppercase tracking-wide bg-black/40 text-white px-2 py-0.5 rounded">
        Before
      </div>
      <div className="absolute top-2 right-2 text-[10px] uppercase tracking-wide bg-black/40 text-white px-2 py-0.5 rounded">
        After
      </div>
    </div>
  );
}
