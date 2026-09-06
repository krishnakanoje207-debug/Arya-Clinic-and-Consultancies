"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Narrow-screen navigation for the admin panel. The sidebar in the layout is
 * `hidden md:flex`, so below md this top bar + disclosure is the only way to
 * reach the other admin pages. `links` is [[group, [[href, label], …]], …];
 * `logoutAction`
 * is the server action passed down from the layout (allowed as a prop).
 */
export default function AdminMobileNav({ links, email, logoutAction }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden border-b border-[var(--border)] bg-cream">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="font-display text-lg text-sage-deep font-semibold">
          Dr. Seema <span className="text-ink-soft text-sm font-normal">Admin</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Admin menu"
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
      </div>

      {open && (
        <nav className="px-4 pb-3 flex flex-col">
          {links.map(([group, items]) => (
            <div key={group}>
              <p className="pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                {group}
              </p>
              {items.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-ink border-b border-[var(--border)]"
                >
                  {label}
                </Link>
              ))}
            </div>
          ))}
          <div className="flex items-center justify-between pt-3">
            <span className="text-xs text-ink-soft break-all">{email}</span>
            <form action={logoutAction}>
              <button type="submit" className="btn-ghost text-xs py-1 px-3">
                Sign out
              </button>
            </form>
          </div>
        </nav>
      )}
    </div>
  );
}
