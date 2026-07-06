import { getTranslations } from "next-intl/server";

// Lotus-petal accent dots, cycled across the chips for a bit of colour.
const DOT_COLORS = ["bg-gold", "bg-rose", "bg-teal", "bg-sage"];

/** Compact chip band of the conditions the doctor treats — pulled from her
 * seeded specialties. Static curated content (bilingual via messages), so it
 * needs no DB and always fills this part of the page. */
export default async function Conditions() {
  const t = await getTranslations("conditions");
  const items = t.raw("items");

  return (
    <section id="conditions" className="bg-sage-soft/40 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="font-display text-3xl text-sage-deep font-semibold">
          <span className="title-accent">{t("title")}</span>
        </h2>
        <p className="mt-3 text-ink-soft max-w-2xl">{t("subtitle")}</p>
        <ul className="mt-8 flex flex-wrap gap-3">
          {items.map((c, i) => (
            <li
              key={i}
              className="card-lift flex items-center gap-2 rounded-full bg-card border border-[var(--border)] px-4 py-2 text-sm text-ink"
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${DOT_COLORS[i % DOT_COLORS.length]}`}
              />
              {c}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
