import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getSettings, isClinicMode } from "@/lib/settings";

/** Contact details + WhatsApp link on every page, clinic map only when
 * Clinic Mode is on, plus the mandatory medical disclaimer. */
export default async function SiteFooter() {
  const t = await getTranslations();
  const locale = await getLocale();
  const s = await getSettings().catch(() => ({}));
  const clinic = isClinicMode(s);

  const wa = s.contact_whatsapp
    ? `https://wa.me/${String(s.contact_whatsapp).replace(/\D/g, "")}`
    : null;

  return (
    <footer className="mt-24 bg-cream-deep">
      {/* Lotus-gradient strip — the ARYA petal colours. */}
      <div className="lotus-strip" aria-hidden="true" />
      <div className="mx-auto max-w-6xl px-4 pt-10 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/arya-logo.png"
          alt=""
          className="h-12 w-12 rounded-full object-cover ring-1 ring-[var(--border)]"
        />
        <div>
          <p className="font-display text-lg text-sage-deep font-semibold leading-tight">
            {s.brand_name || "ARYA"}
          </p>
          <p className="text-xs text-ink-soft">{s.brand_tagline || ""}</p>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <h3 className="font-display text-lg text-sage-deep mb-3">
            {t("sections.contactTitle")}
          </h3>
          <ul className="space-y-2 text-ink-soft">
            {s.contact_phone && (
              <li>
                {t("contact.call")}:{" "}
                <a
                  href={`tel:${String(s.contact_phone).replace(/\s/g, "")}`}
                  className="hover:text-sage-deep"
                >
                  {s.contact_phone}
                </a>
              </li>
            )}
            {wa && (
              <li>
                <a href={wa} className="hover:text-sage-deep" target="_blank" rel="noreferrer">
                  {t("contact.whatsapp")}
                </a>
              </li>
            )}
            {s.contact_email && (
              <li>
                {t("contact.email")}:{" "}
                <a href={`mailto:${s.contact_email}`} className="hover:text-sage-deep">
                  {s.contact_email}
                </a>
              </li>
            )}
            {s.consultation_hours && (
              <li>
                {t("contact.hours")}: {s.consultation_hours}
              </li>
            )}
          </ul>
        </div>

        {clinic && s.clinic_address && (
          <div>
            <h3 className="font-display text-lg text-sage-deep mb-3">
              {t("contact.address")}
            </h3>
            <p className="text-ink-soft whitespace-pre-line">{s.clinic_address}</p>
            {s.maps_embed_url && (
              <iframe
                title="Clinic location"
                src={s.maps_embed_url}
                className="mt-3 w-full h-40 rounded-lg border border-[var(--border)]"
                loading="lazy"
              />
            )}
          </div>
        )}

        <div>
          <h3 className="font-display text-lg text-sage-deep mb-3">
            {t("footer.disclaimer")}
          </h3>
          <p className="text-ink-soft">
            {s.medical_disclaimer ||
              "Information here is for general awareness and is not a substitute for professional medical advice."}
          </p>
          <ul className="mt-4 space-y-1">
            <li>
              <Link href="/privacy" className="hover:text-sage-deep">
                {t("footer.privacy")}
              </Link>
            </li>
            <li>
              <Link href="/policy" className="hover:text-sage-deep">
                {t("footer.policy")}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--border)] py-4 text-center text-xs text-ink-soft">
        © {new Date().getFullYear()} {s.payee_name || "Dr. Seema"}.{" "}
        {t("footer.rights")}
        <span className="sr-only"> Locale: {locale}</span>
      </div>
    </footer>
  );
}
