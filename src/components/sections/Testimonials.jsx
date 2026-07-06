import { getTranslations } from "next-intl/server";
import { localized } from "@/lib/content";

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
  if (!testimonials?.length) return null;

  return (
    <section id="testimonials" className="bg-cream-deep scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="font-display text-3xl text-sage-deep font-semibold mb-8">
          <span className="title-accent">{t("testimonialsTitle")}</span>
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {testimonials.map((tm) => (
            <blockquote key={tm.id} className="card-warm card-lift p-6">
              {tm.rating ? <Stars n={tm.rating} /> : null}
              <p className="mt-3 text-ink-soft italic">
                “{localized(tm, "text", locale)}”
              </p>
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
