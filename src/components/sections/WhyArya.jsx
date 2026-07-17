import { getTranslations } from "next-intl/server";

const ICONS = ["🌿", "💧", "🌍"];

/** Three-card "why choose us" band. Static bilingual content (via messages),
 * so it renders with no DB and adds substance between Services and the
 * success stories. */
export default async function WhyArya() {
  const t = await getTranslations("why");
  const items = t.raw("items");

  return (
    <section id="why" className="bg-cream-deep scroll-mt-28">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="font-display text-3xl text-sage-deep font-semibold mb-8 text-center">
          <span className="title-accent">{t("title")}</span>
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((it, i) => (
            <div key={i} className="card-warm card-lift p-6">
              <div
                aria-hidden="true"
                className="h-11 w-11 rounded-full bg-sage-soft flex items-center justify-center mb-4 text-xl"
              >
                {ICONS[i % ICONS.length]}
              </div>
              <h3 className="font-display text-lg text-ink font-semibold">
                {it.title}
              </h3>
              <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                {it.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
