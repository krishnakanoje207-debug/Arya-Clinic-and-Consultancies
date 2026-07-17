"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Hamburger menu for < lg screens. The desktop mega-nav (SiteHeader ▸
 * DesktopNav) is hidden on mobile; this disclosure replaces it and adds a
 * collapsible "Conditions we treat" group. */
export default function MobileNav({
  links,
  conditionLinks = [],
  conditionsLabel = "Conditions we treat",
  bookLabel,
  menuLabel = "Menu",
}) {
  const [open, setOpen] = useState(false);
  const [condOpen, setCondOpen] = useState(false);

  // Close on Escape and lock nothing else — keep it lightweight.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
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
        <div className="absolute left-0 right-0 top-16 bg-cream border-b border-[var(--border)] shadow-lg max-h-[80vh] overflow-y-auto">
          <nav className="mx-auto max-w-7xl px-4 py-3 flex flex-col">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="py-3 text-ink border-b border-[var(--border)]"
              >
                {label}
              </Link>
            ))}

            {conditionLinks.length ? (
              <div className="border-b border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setCondOpen((o) => !o)}
                  aria-expanded={condOpen}
                  className="w-full flex items-center justify-between py-3 text-ink"
                >
                  {conditionsLabel}
                  <span className={`transition-transform ${condOpen ? "rotate-45" : ""}`}>+</span>
                </button>
                {condOpen && (
                  <ul className="pb-2">
                    {conditionLinks.map(([href, label]) => (
                      <li key={href}>
                        <Link
                          href={href}
                          onClick={() => setOpen(false)}
                          className="block py-2 pl-4 text-sm text-ink-soft"
                        >
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

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
