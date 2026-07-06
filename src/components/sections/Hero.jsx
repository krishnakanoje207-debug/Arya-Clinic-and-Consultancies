import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { localized } from "@/lib/content";
import SafeImage from "@/components/SafeImage";
import Reveal from "@/components/Reveal";

const STAT_COLORS = ["text-terracotta", "text-teal", "text-rose"];

/** Warm personal-brand hero: doctor photo with pulse ring, floating
 * lotus-colour blobs, gold swoosh under the name (echoing the ARYA logo),
 * staggered reveals and the two primary CTAs. */
export default async function Hero({ profile, locale }) {
  const t = await getTranslations("hero");
  const name = profile?.name || "Dr. Seema Prajapati";
  const tagline = localized(profile, "tagline", locale);
  const years = profile?.yearsExperience;
  const degrees = Array.isArray(profile?.degrees) ? profile.degrees : [];
  // Up to 3 stats; label follows the UI language (label_hi → label).
  const stats = (Array.isArray(profile?.stats) ? profile.stats : []).slice(0, 3);
  const statLabel = (s) => (locale === "hi" && s.label_hi) || s.label || "";

  return (
    <section className="hero-blend">
      {/* Decorative lotus-colour blobs — a zero-height absolute overlay so
          they can never affect layout. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden pointer-events-none"
      >
        <div className="blob w-72 h-72 bg-gold-soft -top-16 right-[12%]" />
        <div className="blob w-80 h-80 bg-rose-soft bottom-[-6rem] left-[-4rem]" style={{ animationDelay: "-6s" }} />
        <div className="blob w-64 h-64 bg-teal-soft top-1/3 left-[45%]" style={{ animationDelay: "-12s" }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-16 md:py-24 md:min-h-[72vh] grid md:grid-cols-2 gap-10 items-center">
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
              <p className="mt-4 text-sm text-sage-deep font-semibold tracking-wide">
                {degrees.map((d) => d.title).filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book" className="btn-primary">
                {t("ctaBook")}
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

        <Reveal delay={200} className="relative">
          <div className="relative float-slow">
            {/* Accents sit under the card via explicit stacking (z-0 vs z-10)
                — negative z would drop them behind the section background. */}
            <div
              aria-hidden="true"
              className="absolute -bottom-4 -left-4 h-16 w-28 rounded-2xl bg-gold/85 z-0 rotate-[-6deg]"
            />
            <div
              aria-hidden="true"
              className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-rose/60 z-0"
            />
            <div className="pulse-ring relative z-10 aspect-[4/5] rounded-[2rem] overflow-hidden bg-sage-soft shadow-xl ring-1 ring-[var(--border)]">
              {profile?.heroImage ? (
                <SafeImage
                  src={profile.heroImage}
                  alt={name}
                  width={640}
                  height={800}
                  priority
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sage-deep/50 text-sm">
                  Doctor photo
                </div>
              )}
              {/* Soft sage wash so the photo blends into the warm theme. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-sage/25 via-transparent to-gold/10 mix-blend-multiply"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
