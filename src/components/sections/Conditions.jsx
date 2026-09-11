import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getPublishedConditions, localized } from "@/lib/content";
import { conditionImage } from "@/lib/conditions-data";

/** Trim a longer intro down to a one/two-line card blurb. Reuses the
 * condition's own (admin-editable) intro copy — no separate blurb field. */
function blurbOf(text) {
  const s = String(text || "").trim();
  if (!s) return "";
  const firstStop = s.indexOf(". ");
  const one = firstStop > 40 ? s.slice(0, firstStop + 1) : s;
  return one.length > 150 ? one.slice(0, 147).trimEnd() + "…" : one;
}

/**
 * "What We Treat" — arch-shaped photo cards (v2.1). Each card shows the
 * condition name over its photo; on hover/focus the photo blurs and a short
 * blurb fades in above the "Learn more" link. Pure CSS group-hover/-focus, no
 * JS. Cards link to /conditions/[slug]. Photo per condition is admin-editable
 * (conditions.card_image); a wellness default fills any gap.
 */
export default async function Conditions() {
  const [t, locale, items] = await Promise.all([
    getTranslations("conditions"),
    getLocale(),
    getPublishedConditions(),
  ]);
  if (!items.length) return null;

  return (
    <section id="conditions" className="bg-cream-deep scroll-mt-28">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="font-display text-3xl text-sage-deep font-semibold">
          <span className="title-accent">{t("title")}</span>
        </h2>
        <p className="mt-4 text-ink-soft max-w-2xl">{t("subtitle")}</p>

        {/* Phones: one swipe row of narrower arch cards (62%) so the photo
            cards stay a sensible height; tablet 2 columns, desktop 4. */}
        <ul className="swipe-row [--swipe-card:62%] mt-10 grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
          {items.map((c) => {
            const name = localized(c, "name", locale);
            const blurb = blurbOf(localized(c, "intro", locale));
            return (
              <li key={c.id ?? c.slug}>
                <Link
                  href={`/conditions/${c.slug}`}
                  className="group relative block aspect-[3/4] overflow-hidden rounded-[1.5rem] rounded-tr-[5rem] shadow-lg ring-1 ring-[var(--border)] bg-sage-soft transition-shadow hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep"
                >
                  <Image
                    src={conditionImage(c)}
                    alt=""
                    fill
                    sizes="(min-width:1024px) 25vw, (min-width:768px) 50vw, 62vw"
                    className="object-cover transition duration-500 group-hover:blur-[3px] group-hover:scale-105 group-focus:blur-[3px] group-focus:scale-105"
                  />
                  <div
                    aria-hidden="true"
                    /* Two cards per row on a phone leaves each name ~165px
                       wide, so the longer ones wrap to four lines and climb
                       out of the dark end of the scrim — white text over a
                       pale photo. Carrying some ink all the way to the top
                       keeps them readable at every card width. */
                    className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/50 to-ink/15 transition-colors duration-500 group-hover:from-ink/90 group-hover:via-ink/60 group-focus:from-ink/90 group-focus:via-ink/60"
                  />
                  <div className="absolute inset-0 p-5 flex flex-col justify-end text-white">
                    <h3 className="font-display text-lg font-semibold drop-shadow-sm">
                      {name}
                    </h3>
                    {blurb ? (
                      <p className="mt-1 text-sm text-white/90 leading-snug overflow-hidden max-h-0 opacity-0 transition-all duration-500 group-hover:max-h-32 group-hover:opacity-100 group-focus:max-h-32 group-focus:opacity-100">
                        {blurb}
                      </p>
                    ) : null}
                    <span className="mt-2 inline-block text-sm font-semibold underline underline-offset-4">
                      {t("learnMore")}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
