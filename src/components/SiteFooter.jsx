import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getSettings, isClinicMode } from "@/lib/settings";
import { getProfile, getPublishedConditions, localized } from "@/lib/content";
import { quizSlugs, getQuiz } from "@/lib/quiz-data";

/** Multi-column footer directory: brand + reg no, conditions treated, quick
 * links and clinic contact info. Clinic address/map only when Clinic Mode is
 * on; the mandatory medical disclaimer sits above the copyright bar. */
export default async function SiteFooter() {
  const t = await getTranslations();
  const locale = await getLocale();
  const [s, profile, conditions] = await Promise.all([
    getSettings().catch(() => ({})),
    getProfile(),
    getPublishedConditions(),
  ]);
  const clinic = isClinicMode(s);
  const regNo = profile?.registrationNumber;
  const council = profile?.registrationCouncil;

  const wa = s.contact_whatsapp
    ? `https://wa.me/${String(s.contact_whatsapp).replace(/\D/g, "")}`
    : null;
  const googleUrl = s.google_reviews_url || "";
  const conditionLinks = (conditions || []).slice(0, 8);
  // Self-assessment tools — rendered from the quiz data module so a future
  // quiz appears automatically without touching the footer.
  const toolLinks = quizSlugs().map((slug) => ({
    href: `/quiz/${slug}`,
    label: localized(getQuiz(slug), "name", locale),
  }));

  return (
    <footer className="bg-cream-deep">
      {/* Lotus-gradient strip — the ARYA petal colours. */}
      <div className="lotus-strip" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-4 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-5 text-sm">
        {/* Col 1 — brand */}
        <div>
          <div className="flex items-center gap-3">
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
          {regNo && (
            <p className="mt-4 text-xs text-ink-soft">
              {t("contact.regNo")}: {regNo}
              {council ? ` (${council})` : ""}
            </p>
          )}
          {googleUrl && (
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sage-deep hover:text-terracotta"
            >
              <span className="text-terracotta">★★★★★</span>
              {t("footer.googleReview")}
            </a>
          )}
        </div>

        {/* Col 2 — conditions we treat */}
        {conditionLinks.length ? (
          <div>
            <h3 className="font-display text-lg text-sage-deep mb-3">
              {t("footer.conditionsHeading")}
            </h3>
            <ul className="space-y-2 text-ink-soft">
              {conditionLinks.map((c) => (
                <li key={c.slug}>
                  <Link href={`/conditions/${c.slug}`} className="hover:text-sage-deep">
                    {localized(c, "name", locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Col 3 — quick links */}
        <div>
          <h3 className="font-display text-lg text-sage-deep mb-3">
            {t("footer.quickLinks")}
          </h3>
          <ul className="space-y-2 text-ink-soft">
            <li>
              <Link href="/book" className="hover:text-sage-deep">
                {t("nav.book")}
              </Link>
            </li>
            <li>
              <Link href="/testimonials" className="hover:text-sage-deep">
                {t("nav.testimonials")}
              </Link>
            </li>
            <li>
              <Link href="/#conditions" className="hover:text-sage-deep">
                {t("conditionPage.breadcrumbConditions")}
              </Link>
            </li>
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

        {/* Col 4 — self-assessment tools */}
        {toolLinks.length ? (
          <div>
            <h3 className="font-display text-lg text-sage-deep mb-3">
              {t("footer.tools")}
            </h3>
            <ul className="space-y-2 text-ink-soft">
              {toolLinks.map((tool) => (
                <li key={tool.href}>
                  <Link href={tool.href} className="hover:text-sage-deep">
                    {tool.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Col 5 — clinic info */}
        <div>
          <h3 className="font-display text-lg text-sage-deep mb-3">
            {t("footer.clinicInfo")}
          </h3>
          <ul className="space-y-2 text-ink-soft">
            {s.consultation_hours && (
              <li>
                {t("contact.hours")}: {s.consultation_hours}
              </li>
            )}
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
          </ul>
          {clinic && s.clinic_address && (
            <div className="mt-4">
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
        </div>
      </div>

      {/* Mandatory medical disclaimer. */}
      <div className="mx-auto max-w-7xl px-4 pb-8">
        <p className="text-xs text-ink-soft border-t border-[var(--border)] pt-4">
          <span className="font-semibold text-sage-deep">{t("footer.disclaimer")}:</span>{" "}
          {s.medical_disclaimer ||
            "Information here is for general awareness and is not a substitute for professional medical advice."}
        </p>
      </div>

      <div className="border-t border-[var(--border)] py-4 text-center text-xs text-ink-soft">
        © {new Date().getFullYear()} {s.payee_name || "Dr. Seema"}.{" "}
        {t("footer.rights")}
        <span className="sr-only"> Locale: {locale}</span>
      </div>
    </footer>
  );
}
