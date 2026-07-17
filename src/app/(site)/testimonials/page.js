import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  getPublishedCases,
  getPublishedTestimonials,
  localized,
} from "@/lib/content";
import { getSettings } from "@/lib/settings";
import CaseGalleryGrid from "@/components/CaseGalleryGrid";
import TestimonialsBoard from "@/components/TestimonialsBoard";
import Reveal from "@/components/Reveal";

// Hourly revalidation, same as the home + condition pages: admin edits surface
// without a redeploy while keeping Neon compute-hours low.
export const revalidate = 3600;

export async function generateMetadata() {
  const t = await getTranslations("testimonialsPage");
  return {
    title: t("heroTitle"),
    description: t("heroIntro"),
  };
}

export default async function TestimonialsPage() {
  const locale = await getLocale();
  const t = await getTranslations();
  const [testimonials, cases, settings] = await Promise.all([
    getPublishedTestimonials(),
    getPublishedCases(),
    getSettings(["contact_phone", "contact_whatsapp", "google_reviews_url"]),
  ]);

  const tmItems = testimonials.map((tm) => ({
    id: tm.id,
    name: tm.patientName,
    text: localized(tm, "text", locale),
    rating: tm.rating,
    photo: tm.photo,
    condition: tm.condition || "",
    videoUrl: tm.videoUrl || "",
  }));

  const caseItems = cases.map((c) => ({
    id: c.id,
    condition: localized(c, "condition", locale),
    description: localized(c, "description", locale),
    duration: c.treatmentDuration || "",
    before: c.beforeImage,
    after: c.afterImage,
  }));

  const phone = settings?.contact_phone
    ? String(settings.contact_phone).replace(/\s/g, "")
    : null;
  const wa = settings?.contact_whatsapp
    ? `https://wa.me/${String(settings.contact_whatsapp).replace(/\D/g, "")}`
    : null;
  const googleUrl = settings?.google_reviews_url || "";

  return (
    <>
      {/* Hero band */}
      <section className="relative bg-cream overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="blob w-72 h-72 bg-rose-soft -top-16 right-[10%]" />
          <div className="blob w-72 h-72 bg-gold-soft bottom-[-6rem] left-[-4rem]" style={{ animationDelay: "-6s" }} />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-14 md:py-20">
          <Reveal>
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-ink leading-tight max-w-3xl">
              <span className="title-accent">{t("testimonialsPage.heroTitle")}</span>
            </h1>
            <p className="mt-5 text-lg text-ink-soft max-w-2xl leading-relaxed">
              {t("testimonialsPage.heroIntro")}
            </p>
            {googleUrl ? (
              <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-card border border-[var(--border)] px-4 py-2 text-sm font-semibold text-sage-deep hover:border-sage transition"
              >
                <span className="text-terracotta">★★★★★</span>
                {t("footer.googleReview")}
              </a>
            ) : null}
          </Reveal>
        </div>
      </section>

      {/* Before & after journeys */}
      {caseItems.length ? (
        <Reveal>
          <section className="bg-cream-deep">
            <div className="mx-auto max-w-7xl px-4 py-14">
              <h2 className="font-display text-3xl text-sage-deep font-semibold mb-8">
                <span className="title-accent">{t("testimonialsPage.storiesHeading")}</span>
              </h2>
              <CaseGalleryGrid
                items={caseItems}
                allLabel={t("testimonialsPage.allLabel")}
                readMoreLabel={locale === "hi" ? "पूरी कहानी पढ़ें" : "Read full story"}
                closeLabel={locale === "hi" ? "बंद करें" : "Close"}
              />
            </div>
          </section>
        </Reveal>
      ) : null}

      {/* Written & video testimonials */}
      <Reveal>
        <section className="bg-cream">
          <div className="mx-auto max-w-7xl px-4 py-14">
            <h2 className="font-display text-3xl text-sage-deep font-semibold mb-8">
              <span className="title-accent">{t("testimonialsPage.testimonialsHeading")}</span>
            </h2>
            {tmItems.length ? (
              <TestimonialsBoard
                items={tmItems}
                allLabel={t("testimonialsPage.allLabel")}
                watchLabel={t("testimonialsPage.watchVideo")}
              />
            ) : (
              <p className="text-ink-soft">{t("testimonialsPage.empty")}</p>
            )}
          </div>
        </section>
      </Reveal>

      {/* Closing booking CTA band */}
      <Reveal>
        <section className="bg-cream-deep">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <div className="card-warm p-8 md:p-10 text-center">
              <h2 className="font-display text-3xl text-sage-deep font-semibold">
                {t("testimonialsPage.ctaTitle")}
              </h2>
              <p className="mt-3 text-ink-soft max-w-xl mx-auto">
                {t("testimonialsPage.ctaBody")}
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/book" className="btn-primary">
                  {t("nav.book")}
                </Link>
                {phone ? (
                  <a href={`tel:${phone}`} className="btn-ghost">
                    {t("contact.call")}
                  </a>
                ) : null}
                {wa ? (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                    {t("contact.whatsapp")}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </Reveal>
    </>
  );
}
