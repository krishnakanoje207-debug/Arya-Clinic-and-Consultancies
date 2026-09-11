import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { localized } from "@/lib/content";
import TestimonialQuote from "@/components/TestimonialQuote";

function Stars({ n }) {
  const count = Math.max(0, Math.min(5, n || 0));
  return (
    <span className="text-terracotta" aria-label={`${count} out of 5`}>
      {"★".repeat(count)}
      <span className="text-sage-soft">{"★".repeat(5 - count)}</span>
    </span>
  );
}

export default async function Testimonials({ testimonials, locale }) {
  const t = await getTranslations("sections");
  // Reuses the success-story wording rather than duplicating the strings.
  const st = await getTranslations("stories");
  if (!testimonials?.length) return null;

  return (
    <section id="testimonials" className="bg-cream-deep scroll-mt-28">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="flex items-end justify-between gap-4 mb-8">
          <h2 className="font-display text-3xl text-sage-deep font-semibold">
            <span className="title-accent">{t("testimonialsTitle")}</span>
          </h2>
          <Link
            href="/testimonials"
            className="shrink-0 text-sm font-semibold text-sage-deep hover:text-terracotta transition"
          >
            {t("viewAll")} →
          </Link>
        </div>
        <div className="swipe-row grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {testimonials.map((tm) => (
            <blockquote key={tm.id} className="card-warm card-lift p-6">
              {tm.rating ? <Stars n={tm.rating} /> : null}
              <TestimonialQuote
                text={localized(tm, "text", locale)}
                labels={{ readMore: st("readMore"), readLess: st("readLess") }}
              />
              <footer className="mt-4 text-sm font-semibold text-ink">
                — {tm.patientName}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
