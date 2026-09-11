import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { localized } from "@/lib/content";
import SuccessStoriesSlider from "@/components/SuccessStoriesSlider";

/** Featured "Stories of Hope" band (v2.1) — one published before/after case at
 * a time in a two-column layout, cycled by a client slider. The /testimonials
 * page (CaseGalleryGrid) is untouched. Consent-gated: the query only returns
 * published, consent-confirmed cases. */
export default async function SuccessStories({ cases, locale }) {
  const t = await getTranslations();
  if (!cases?.length) return null;

  const items = cases.map((c) => ({
    id: c.id,
    condition: localized(c, "condition", locale),
    description: localized(c, "description", locale),
    duration: c.treatmentDuration || "",
    city: c.city || "",
    before: c.beforeImage,
    after: c.afterImage,
  }));

  const labels = {
    condition: t("stories.condition"),
    duration: t("stories.duration"),
    city: t("stories.city"),
    readMore: t("stories.readMore"),
    readLess: t("stories.readLess"),
    prev: t("stories.prev"),
    next: t("stories.next"),
    realImages: t("stories.realImages"),
  };

  return (
    <section id="stories" className="bg-cream scroll-mt-28">
      <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div className="text-center max-w-3xl mx-auto mb-6 md:mb-10">
          <h2 className="font-display text-3xl text-sage-deep font-semibold">
            <span className="title-accent">{t("stories.title")}</span>
          </h2>
          <p className="mt-4 text-ink-soft">{t("stories.intro")}</p>
        </div>

        <SuccessStoriesSlider items={items} labels={labels} />

        <div className="mt-8 md:mt-10 text-center">
          <Link href="/testimonials" className="btn-ghost inline-block">
            {t("stories.viewAll")} →
          </Link>
        </div>
      </div>
    </section>
  );
}
