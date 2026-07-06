import { getTranslations } from "next-intl/server";
import { localized } from "@/lib/content";
import CaseGalleryGrid from "@/components/CaseGalleryGrid";

/** Consent-gated before/after gallery. Only published, consent-confirmed
 * cases reach here (query enforces both). Cases are localized server-side,
 * then a client grid adds condition filter chips. */
export default async function SuccessStories({ cases, locale }) {
  const t = await getTranslations("sections");
  if (!cases?.length) return null;

  const items = cases.map((c) => ({
    id: c.id,
    condition: localized(c, "condition", locale),
    description: localized(c, "description", locale),
    duration: c.treatmentDuration || "",
    before: c.beforeImage,
    after: c.afterImage,
  }));

  return (
    <section id="stories" className="bg-cream scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="font-display text-3xl text-sage-deep font-semibold mb-8">
          <span className="title-accent">{t("storiesTitle")}</span>
        </h2>
        <CaseGalleryGrid
          items={items}
          allLabel={locale === "hi" ? "सभी" : "All"}
          readMoreLabel={locale === "hi" ? "पूरी कहानी पढ़ें" : "Read full story"}
          closeLabel={locale === "hi" ? "बंद करें" : "Close"}
        />
      </div>
    </section>
  );
}
