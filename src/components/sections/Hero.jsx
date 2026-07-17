import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { localized } from "@/lib/content";
import SafeImage from "@/components/SafeImage";
import Reveal from "@/components/Reveal";

const STAT_COLORS = ["text-terracotta", "text-teal", "text-rose"];

/** Hero (v2.1) — a transparent "window" onto the page's fixed clinic
 * background. Text sits over a soft left-side cream scrim for AA-legible
 * contrast; the doctor portrait is kept small (the headline + CTAs lead), with
 * the full portrait shown in the About section near the bottom. */
export default async function Hero({ profile, locale, bookFee = null }) {
  const t = await getTranslations("hero");
  const name = profile?.name || "Dr. Seema Prajapati";
  const tagline = localized(profile, "tagline", locale);
  const years = profile?.yearsExperience;
  const degrees = Array.isArray(profile?.degrees) ? profile.degrees : [];
  // Up to 3 stats; label follows the UI language (label_hi → label).
  const stats = (Array.isArray(profile?.stats) ? profile.stats : []).slice(0, 3);
  const statLabel = (s) => (locale === "hi" && s.label_hi) || s.label || "";

  return (
    <section className="relative overflow-hidden scroll-mt-28">
      {/* Cream scrim over the fixed background — heavier on the left where the
          text sits, fading to reveal the photo on the right. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-cream via-cream/85 to-cream/20"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 md:py-24 md:min-h-[68vh] grid md:grid-cols-[1.35fr_0.65fr] gap-10 items-center">
        <div>
          <Reveal>
            {years ? (
              <p className="inline-block rounded-full bg-sage-soft text-sage-deep px-4 py-1 text-sm font-semibold">
                🌿 {years}+ {t("yearsSuffix")}
              </p>
            ) : null}
            <h1 className="mt-5 font-display text-4xl md:text-5xl font-semibold text-ink leading-tight">
              <span className="title-accent">{name}</span>
            </h1>
          </Reveal>

          <Reveal delay={120}>
            {tagline ? (
              <p className="mt-4 text-lg text-ink-soft max-w-md">{tagline}</p>
            ) : null}
            {degrees.length ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {degrees
                  .map((d) => d.title)
                  .filter(Boolean)
                  .map((title, i) => (
                    <li
                      key={i}
                      className="rounded-full bg-gold-soft text-sage-deep px-3 py-1 text-xs font-semibold tracking-wide"
                    >
                      {title}
                    </li>
                  ))}
              </ul>
            ) : null}
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book" className="btn-primary">
                {t("ctaBook")}
                {bookFee ? ` — ₹${bookFee}` : ""}
              </Link>
              <Link href="/#stories" className="btn-ghost">
                {t("ctaStories")}
              </Link>
            </div>
          </Reveal>

          {stats.length ? (
            <Reveal delay={360}>
              <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
                {stats.map((s, i) => (
                  <div key={i} className="min-w-0">
                    <dt
                      className={`font-display text-2xl font-semibold whitespace-nowrap ${STAT_COLORS[i % STAT_COLORS.length]}`}
                    >
                      {s.value}
                    </dt>
                    <dd className="text-ink-soft text-xs mt-0.5">{statLabel(s)}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          ) : null}
        </div>

        <Reveal delay={200} className="relative flex justify-center md:justify-end">
          <div className="relative w-40 sm:w-48 md:w-56 float-slow">
            {/* Small lotus-colour accents under the portrait card. */}
            <div
              aria-hidden="true"
              className="absolute -bottom-3 -left-3 h-10 w-16 rounded-xl bg-gold/85 z-0 rotate-[-6deg]"
            />
            <div
              aria-hidden="true"
              className="absolute -top-3 -right-3 h-12 w-12 rounded-full bg-rose/60 z-0"
            />
            <div className="pulse-ring relative z-10 aspect-[4/5] rounded-[1.5rem] overflow-hidden bg-sage-soft shadow-xl ring-1 ring-[var(--border)]">
              {profile?.heroImage ? (
                <SafeImage
                  src={profile.heroImage}
                  alt={name}
                  width={280}
                  height={350}
                  priority
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sage-deep/50 text-sm">
                  Doctor photo
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
