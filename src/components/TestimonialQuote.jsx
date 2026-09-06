"use client";

import { useState } from "react";

/**
 * A testimonial body that collapses when it runs long, so one talkative
 * patient can't stretch a whole row of cards. Threshold and clamp match
 * SuccessStoriesSlider so the two read the same.
 *
 * labels: { readMore, readLess }
 */
export default function TestimonialQuote({ text, labels }) {
  const [expanded, setExpanded] = useState(false);
  const long = (text || "").length > 180;

  return (
    <>
      <p
        className={`mt-3 text-ink-soft italic ${
          !expanded && long ? "line-clamp-4" : ""
        }`}
      >
        “{text}”
      </p>
      {long ? (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="mt-2 text-sm font-semibold text-sage-deep hover:text-terracotta"
        >
          {expanded ? labels.readLess : `…${labels.readMore}`}
        </button>
      ) : null}
    </>
  );
}
