import { getTranslations } from "next-intl/server";
import { localized } from "@/lib/content";

/** Accordion grouped by category. Uses native <details> so it works
 * without JS (accessible + zero client bundle). */
export default async function Faq({ faqs, locale }) {
  const t = await getTranslations("sections");
  if (!faqs?.length) return null;

  const groups = {};
  for (const f of faqs) {
    (groups[f.category] ||= []).push(f);
  }

  return (
    <section id="faq" className="bg-cream-deep scroll-mt-20">
      <div className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="font-display text-3xl text-sage-deep font-semibold mb-8">
          <span className="title-accent">{t("faqTitle")}</span>
        </h2>
        {Object.entries(groups).map(([category, items]) => (
          <div key={category} className="mb-8">
            <h3 className="text-sm uppercase tracking-wide text-sage-deep mb-3">
              {category}
            </h3>
            <div className="space-y-2">
              {items.map((f) => (
                <details
                  key={f.id}
                  className="card-warm faq-item px-5 py-3 group"
                >
                  <summary className="cursor-pointer list-none font-semibold text-ink flex justify-between items-center gap-4">
                    {localized(f, "question", locale)}
                    <span className="shrink-0 h-6 w-6 rounded-full bg-sage-soft text-sage-deep flex items-center justify-center group-open:rotate-45 transition-transform">
                      +
                    </span>
                  </summary>
                  <p className="faq-answer mt-3 text-sm text-ink-soft whitespace-pre-line">
                    {localized(f, "answer", locale)}
                  </p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
