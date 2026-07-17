"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

/** Persistent conversion layer (public pages only):
 *  - md+  : floating WhatsApp + click-to-call buttons, bottom-right.
 *  - <md  : sticky bottom bar with Call / WhatsApp / Book.
 * Call & WhatsApp render only when their settings exist; Book always shows.
 * Rendered from the (site) layout, so admin pages never get it. */
export default function StickyContact({ phone, whatsapp }) {
  const t = useTranslations();
  const tel = phone ? `tel:${String(phone).replace(/\s/g, "")}` : null;
  const wa = whatsapp
    ? `https://wa.me/${String(whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(
        t("sticky.waMessage"),
      )}`
    : null;

  // Mobile bar keeps equal columns whatever is present (Book is always on).
  const mobileCount = 1 + (tel ? 1 : 0) + (wa ? 1 : 0);

  return (
    <>
      {/* Desktop floating buttons */}
      <div className="hidden md:flex fixed bottom-6 right-6 z-40 flex-col gap-3">
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            aria-label={t("contact.whatsapp")}
            className="h-12 w-12 rounded-full bg-teal text-white shadow-lg flex items-center justify-center transition-transform hover:-translate-y-0.5"
          >
            <WhatsAppIcon />
          </a>
        )}
        {tel && (
          <a
            href={tel}
            aria-label={t("contact.call")}
            className="h-12 w-12 rounded-full bg-sage-deep text-white shadow-lg flex items-center justify-center transition-transform hover:-translate-y-0.5"
          >
            <PhoneIcon />
          </a>
        )}
      </div>

      {/* Mobile sticky bottom bar */}
      <nav
        aria-label={t("nav.contact")}
        className="md:hidden fixed bottom-0 inset-x-0 z-40 grid border-t border-[var(--border)] bg-cream/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
        style={{ gridTemplateColumns: `repeat(${mobileCount}, minmax(0, 1fr))` }}
      >
        {tel && (
          <a
            href={tel}
            aria-label={t("contact.call")}
            className="flex flex-col items-center gap-1 py-2.5 text-sage-deep"
          >
            <PhoneIcon />
            <span className="text-[11px] font-semibold">{t("contact.call")}</span>
          </a>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            aria-label={t("contact.whatsapp")}
            className="flex flex-col items-center gap-1 py-2.5 text-teal"
          >
            <WhatsAppIcon />
            <span className="text-[11px] font-semibold">WhatsApp</span>
          </a>
        )}
        <Link
          href="/book"
          aria-label={t("nav.book")}
          className="flex flex-col items-center gap-1 py-2.5 bg-terracotta text-white"
        >
          <CalendarIcon />
          <span className="text-[11px] font-semibold">{t("sticky.book")}</span>
        </Link>
      </nav>
    </>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.475-18.36C18.24 1.245 15.24 0 12.045 0 5.463 0 .103 5.359.1 11.945c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.652a11.933 11.933 0 005.706 1.454h.005c6.585 0 11.946-5.359 11.949-11.945a11.86 11.86 0 00-3.495-8.377z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
    </svg>
  );
}
