"use client";

import { useState } from "react";

/** Vertical numbered step list (v2.1). Numbered circles joined by a thin line;
 * the active step shows its title bold + description, inactive steps show only
 * a greyed title. Clicking a step activates it (step 1 active by default). */
export default function HealingSteps({ steps }) {
  const [active, setActive] = useState(0);

  return (
    <ol className="relative mt-8">
      {steps.map((s, idx) => {
        const on = idx === active;
        return (
          <li key={idx} className="relative pl-14 pb-8 last:pb-0">
            {idx < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute left-[21px] top-12 bottom-1 w-px bg-[var(--border)]"
              />
            ) : null}
            <button
              type="button"
              onClick={() => setActive(idx)}
              aria-current={on ? "step" : undefined}
              className="text-left w-full"
            >
              <span
                className={`absolute left-0 top-0 h-11 w-11 rounded-full flex items-center justify-center font-display text-lg font-semibold transition ${
                  on
                    ? "bg-sage-deep text-cream shadow-md"
                    : "bg-sage-soft text-sage-deep"
                }`}
              >
                {idx + 1}
              </span>
              <h3
                className={`font-display text-lg transition ${
                  on ? "text-ink font-semibold" : "text-ink-soft"
                }`}
              >
                {s.title}
              </h3>
              {on ? (
                <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                  {s.body}
                </p>
              ) : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
