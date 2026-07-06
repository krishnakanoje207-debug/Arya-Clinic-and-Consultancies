"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Hamburger menu for < md screens. The desktop nav (in SiteHeader) is
 * hidden on mobile; this disclosure replaces it. */
export default function MobileNav({ links, bookLabel, menuLabel = "Menu" }) {
  const [open, setOpen] = useState(false);

  // Close on Escape and lock nothing else — keep it lightweight.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={menuLabel}
        className="p-2 -mr-2 text-sage-deep"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-16 bg-cream border-b border-[var(--border)] shadow-lg">
          <nav className="mx-auto max-w-6xl px-4 py-3 flex flex-col">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="py-3 text-ink border-b border-[var(--border)] last:border-0"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/book"
              onClick={() => setOpen(false)}
              className="btn-primary text-sm text-center mt-3"
            >
              {bookLabel}
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
