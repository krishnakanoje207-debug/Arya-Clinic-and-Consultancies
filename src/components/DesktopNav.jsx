"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Desktop (lg+) two-tier header navigation with mega-menu panels — v2.1
 * reference alignment (structure only; ARYA theme unchanged).
 *
 * Panels open on hover AND on click/Enter (aria-expanded), and close on Esc or
 * a click outside. Hover-open closes on a short delay so the pointer can cross
 * the header's padding into the panel without the menu vanishing mid-travel;
 * a click PINS the panel open (a plain toggle was unusable with a mouse, since
 * hovering had already opened it and the click only ever closed it again).
 * All content arrives as serializable props from the server
 * SiteHeader (localized labels + hrefs) — no functions cross the boundary.
 * Mobile keeps the existing MobileNav hamburger; this component is hidden < lg.
 *
 * menus: [{ id, label, columns: [{ heading, links: [{label, href}] }], footer?: {label, href} }]
 * links: [{ label, href }]  — plain (non-mega) links
 */
export default function DesktopNav({ menus = [], links = [] }) {
  const [openId, setOpenId] = useState(null);
  // A pinned panel was opened by click and ignores the pointer leaving.
  const [pinned, setPinned] = useState(false);
  const ref = useRef(null);
  const closeTimer = useRef(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const closeNow = () => {
    cancelClose();
    setOpenId(null);
    setPinned(false);
  };
  // Grace period for the gap between the trigger row and the panel.
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenId(null), 180);
  };

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!openId) return;
    // Inlined rather than reusing closeNow so this effect keeps depending on
    // openId alone; the timer lives in a ref, so nothing here goes stale.
    const close = () => {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      setOpenId(null);
      setPinned(false);
    };
    const onKey = (e) => e.key === "Escape" && close();
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) close();
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
      onMouseLeave={() => {
        if (!pinned) scheduleClose();
      }}
    >
      {menus.map((m) => (
        <div
          key={m.id}
          onMouseEnter={() => {
            cancelClose();
            if (openId !== m.id) setPinned(false);
            setOpenId(m.id);
          }}
        >
          <button
            type="button"
            aria-expanded={openId === m.id}
            aria-haspopup="true"
            onClick={() => {
              cancelClose();
              if (openId === m.id && pinned) {
                closeNow();
              } else {
                setOpenId(m.id);
                setPinned(true);
              }
            }}
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
          <div
            onMouseEnter={cancelClose}
            className="border-y border-[var(--border)] bg-card shadow-xl"
          >
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
                            onClick={closeNow}
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
                    onClick={closeNow}
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
