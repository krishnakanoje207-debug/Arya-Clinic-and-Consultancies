"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const KEY = "arya.cookieNotice";

/** One-time cookie notice. The site sets only essential cookies (the language
 * preference and the admin session), so this informs rather than gates —
 * nothing is withheld until it is dismissed. The dismissal itself is kept in
 * localStorage, not a cookie. Sits above the mobile sticky bar. */
export default function CookieNotice() {
  const t = useTranslations("cookies");
  const [show, setShow] = useState(false);

  // localStorage only exists after mount, so reading it here is a legitimate
  // external → React sync (rendering it during SSR would mismatch hydration).
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* storage blocked — stay quiet rather than nag on every page */
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-16 md:bottom-0 z-50 border-t border-[var(--border)] bg-cream/98 backdrop-blur px-4 py-3 shadow-lg"
    >
      <div className="mx-auto max-w-5xl flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-ink-soft">
        <p className="flex-1">
          {t("text")}{" "}
          <Link href="/privacy" className="text-sage-deep font-semibold underline">
            {t("learn")}
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="btn-primary shrink-0 self-start sm:self-auto"
        >
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
