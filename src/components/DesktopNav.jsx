"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Desktop (lg+) two-tier header navigation with mega-menu panels — v2.1
 * reference alignment (structure only; ARYA theme unchanged).
 *
 * Panels open on hover AND on click/Enter (aria-expanded), and close on Esc or
 * a click outside. All content arrives as serializable props from the server
 * SiteHeader (localized labels + hrefs) — no functions cross the boundary.
 * Mobile keeps the existing MobileNav hamburger; this component is hidden < lg.
 *
 * menus: [{ id, label, columns: [{ heading, links: [{label, href}] }], footer?: {label, href} }]
 * links: [{ label, href }]  — plain (non-mega) links
 */
export default function DesktopNav({ menus = [], links = [] }) {
  const [openId, setOpenId] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!openId) return;
    const onKey = (e) => e.key === "Escape" && setOpenId(null);
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onClick);
    };
  }, [openId]);

  const active = menus.find((m) => m.id === openId);

  return (
    <nav
      ref={ref}
      className="hidden lg:flex items-center gap-1"
      onMouseLeave={() => setOpenId(null)}
    >
      {menus.map((m) => (
        <div key={m.id} onMouseEnter={() => setOpenId(m.id)}>
          <button
            type="button"
            aria-expanded={openId === m.id}
            aria-haspopup="true"
            onClick={() => setOpenId((cur) => (cur === m.id ? null : m.id))}
            className="flex items-center gap-1 px-3 py-2 text-sm text-ink-soft hover:text-sage-deep"
          >
            {m.label}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className={`transition-transform ${openId === m.id ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ))}

      {links.map((l) => (
        <Link
          key={l.href + l.label}
          href={l.href}
          className="px-3 py-2 text-sm text-ink-soft hover:text-sage-deep"
        >
          {l.label}
        </Link>
      ))}

      {/* Positioned against the sticky <header> (the nearest positioned
          ancestor), not this nav — the nav sits right of viewport center,
          so a nav-centered w-screen panel clips off the left edge. */}
      {active ? (
        <div
          role="region"
          aria-label={active.label}
          className="absolute top-full inset-x-0 z-40"
        >
          <div className="mt-2 border-y border-[var(--border)] bg-card shadow-xl">
            <div className="mx-auto max-w-7xl px-6 py-8">
              <div className="flex flex-wrap gap-x-12 gap-y-8">
                {active.columns.map((col) => (
                  <div key={col.heading} className="min-w-[190px]">
                    <h3 className="font-display text-lg text-sage-deep font-semibold mb-2">
                      {col.heading}
                    </h3>
                    <ul>
                      {col.links.map((link) => (
                        <li key={link.href + link.label}>
                          <Link
                            href={link.href}
                            onClick={() => setOpenId(null)}
                            className="block py-2 border-b border-[var(--border)] text-ink-soft hover:text-sage-deep transition"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {active.footer ? (
                <div className="mt-6 text-right">
                  <Link
                    href={active.footer.href}
                    onClick={() => setOpenId(null)}
                    className="text-sm font-semibold text-sage-deep hover:text-terracotta"
                  >
                    {active.footer.label} →
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
