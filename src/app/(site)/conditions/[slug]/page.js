import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  getConditionBySlug,
  getPublishedCases,
  getPublishedConditions,
  localized,
} from "@/lib/content";
import { getSettings } from "@/lib/settings";
import CaseGalleryGrid from "@/components/CaseGalleryGrid";
import { FaqJsonLd } from "@/components/JsonLd";
import Reveal from "@/components/Reveal";

// Same hourly revalidation as the home page: admin edits surface without a
// redeploy while keeping Neon compute-hours low.
export const revalidate = 3600;

export async function generateStaticParams() {
  const list = await getPublishedConditions();
  return list.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const condition = await getConditionBySlug(slug);
  if (!condition) return {};
  const locale = await getLocale();
  return {
    title: localized(condition, "name", locale),
    description: localized(condition, "intro", locale) || undefined,
  };
}

/** Localize an array of { text, text_hi } into plain strings. */
function localizeList(arr, locale) {
  return (Array.isArray(arr) ? arr : [])
    .map((it) => (locale === "hi" && it.text_hi) || it.text)
    .filter(Boolean);
}

const SYMPTOM_DOTS = ["bg-gold", "bg-rose", "bg-teal", "bg-sage"];
const CAUSE_DOTS = ["bg-teal", "bg-sage", "bg-gold", "bg-rose"];

export default async function ConditionPage({ params }) {
  const { slug } = await params;
  const condition = await getConditionBySlug(slug);
  if (!condition) notFound();

  const locale = await getLocale();
  const t = await getTranslations();
  const [settings, allCases] = await Promise.all([
    getSettings(["contact_whatsapp"]),
    getPublishedCases(),
  ]);

  const name = localized(condition, "name", locale);
  const intro = localized(condition, "intro", locale);
  const overview = localized(condition, "overview", locale);
  const approach = localized(condition, "approach", locale);
  const symptoms = localizeList(condition.symptoms, locale);
  const causes = localizeList(condition.causes, locale);
  const references = Array.isArray(condition.references)
    ? condition.references.filter((r) => r?.url && r?.title)
    : [];

  const faqList = (Array.isArray(condition.faqs) ? condition.faqs : [])
    .map((f) => ({
      question: (locale === "hi" && f.q_hi) || f.q,
      answer: (locale === "hi" && f.a_hi) || f.a,
      // Kept for the FAQPage JSON-LD (reads *Hi with English fallback).
      questionHi: f.q_hi,
      answerHi: f.a_hi,
    }))
    .filter((f) => f.question && f.answer);

  // Related published cases: simple case-insensitive contains match on the
  // (English) condition name or slug. Seeded cases are unpublished, so this is
  // usually empty until the doctor publishes real before/after stories.
  const nameLc = condition.name.toLowerCase();
  const relatedCases = allCases.filter((cs) => {
    const cc = String(cs.condition || "").toLowerCase();
    return cc && (nameLc.includes(cc) || cc.includes(nameLc) || cc.includes(slug));
  });
  const relatedItems = relatedCases.map((c) => ({
    id: c.id,
    condition: localized(c, "condition", locale),
    description: localized(c, "description", locale),
    duration: c.treatmentDuration || "",
    before: c.beforeImage,
    after: c.afterImage,
  }));

  const wa = settings?.contact_whatsapp
    ? `https://wa.me/${String(settings.contact_whatsapp).replace(/\D/g, "")}`
    : null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name,
    description: intro || undefined,
    url: `${siteUrl}/conditions/${slug}`,
    about: {
      "@type": "MedicalCondition",
      name: condition.name,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <FaqJsonLd faqs={faqList} locale={locale} />

      {/* Hero band */}
      <section className="relative bg-cream overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="blob w-72 h-72 bg-gold-soft -top-16 right-[10%]" />
          <div className="blob w-72 h-72 bg-rose-soft bottom-[-6rem] left-[-4rem]" style={{ animationDelay: "-6s" }} />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-14 md:py-20">
          <Reveal>
            <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className="hover:text-sage-deep">
                    {t("nav.home")}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href="/#conditions" className="hover:text-sage-deep">
                    {t("conditionPage.breadcrumbConditions")}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="text-ink">{name}</li>
              </ol>
            </nav>
            <h1 className="mt-5 font-display text-4xl md:text-5xl font-semibold text-ink leading-tight max-w-3xl">
              <span className="title-accent">{name}</span>
            </h1>
            {intro ? (
              <p className="mt-5 text-lg text-ink-soft max-w-2xl leading-relaxed">
                {intro}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book" className="btn-primary">
                {t("nav.book")}
              </Link>
              {wa ? (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                  {t("contact.whatsapp")}
                </a>
              ) : (
                <Link href="/book" className="btn-ghost">
                  {t("hero.ctaStories")}
                </Link>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Overview */}
      {overview ? (
        <Reveal>
          <section className="bg-cream-deep">
            <div className="mx-auto max-w-3xl px-4 py-14">
              <p className="text-ink-soft leading-relaxed whitespace-pre-line">
                {overview}
              </p>
            </div>
          </section>
        </Reveal>
      ) : null}

      {/* Symptoms */}
      {symptoms.length ? (
        <Reveal>
          <section className="bg-cream">
            <div className="mx-auto max-w-7xl px-4 py-14">
              <h2 className="font-display text-3xl text-sage-deep font-semibold mb-8">
                <span className="title-accent">{t("conditionPage.symptoms")}</span>
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {symptoms.map((s, i) => (
                  <li key={i} className="card-warm card-lift p-5 flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${SYMPTOM_DOTS[i % SYMPTOM_DOTS.length]}`}
                    />
                    <span className="text-ink leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </Reveal>
      ) : null}

      {/* Common causes — visually distinct soft band */}
      {causes.length ? (
        <Reveal>
          <section className="bg-sage-soft/40">
            <div className="mx-auto max-w-7xl px-4 py-14">
              <h2 className="font-display text-3xl text-sage-deep font-semibold mb-8">
                <span className="title-accent">{t("conditionPage.causes")}</span>
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {causes.map((c, i) => (
                  <li
                    key={i}
                    className="card-lift rounded-2xl bg-card border border-[var(--border)] p-5 flex items-start gap-3"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${CAUSE_DOTS[i % CAUSE_DOTS.length]}`}
                    />
                    <span className="text-ink leading-relaxed">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </Reveal>
      ) : null}

      {/* How homoeopathy helps */}
      {approach ? (
        <Reveal>
          <section className="bg-cream">
            <div className="mx-auto max-w-3xl px-4 py-14">
              <h2 className="font-display text-3xl text-sage-deep font-semibold mb-8">
                <span className="title-accent">{t("conditionPage.approach")}</span>
              </h2>
              <blockquote className="card-warm border-l-4 border-sage p-6 text-ink-soft leading-relaxed whitespace-pre-line">
                {approach}
              </blockquote>
            </div>
          </section>
        </Reveal>
      ) : null}

      {/* Related success stories */}
      {relatedItems.length ? (
        <Reveal>
          <section className="bg-cream-deep">
            <div className="mx-auto max-w-7xl px-4 py-14">
              <h2 className="font-display text-3xl text-sage-deep font-semibold mb-8">
                <span className="title-accent">{t("conditionPage.relatedStories")}</span>
              </h2>
              <CaseGalleryGrid
                items={relatedItems}
                allLabel={locale === "hi" ? "सभी" : "All"}
                readMoreLabel={locale === "hi" ? "पूरी कहानी पढ़ें" : "Read full story"}
                closeLabel={locale === "hi" ? "बंद करें" : "Close"}
              />
            </div>
          </section>
        </Reveal>
      ) : null}

      {/* Per-condition FAQs */}
      {faqList.length ? (
        <Reveal>
          <section className="bg-cream">
            <div className="mx-auto max-w-3xl px-4 py-14">
              <h2 className="font-display text-3xl text-sage-deep font-semibold mb-8">
                <span className="title-accent">{t("conditionPage.faqs")}</span>
              </h2>
              <div className="space-y-2">
                {faqList.map((f, i) => (
                  <details key={i} className="card-warm faq-item px-5 py-3 group">
                    <summary className="cursor-pointer list-none font-semibold text-ink flex justify-between items-center gap-4">
                      {f.question}
                      <span className="shrink-0 h-6 w-6 rounded-full bg-sage-soft text-sage-deep flex items-center justify-center group-open:rotate-45 transition-transform">
                        +
                      </span>
                    </summary>
                    <p className="faq-answer mt-3 text-sm text-ink-soft whitespace-pre-line">
                      {f.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </Reveal>
      ) : null}

      {/* Sources */}
      {references.length ? (
        <Reveal>
          <section className="bg-sage-soft/40">
            <div className="mx-auto max-w-3xl px-4 py-14">
              <h2 className="text-sm uppercase tracking-wide text-sage-deep mb-4">
                {t("conditionPage.sources")}
              </h2>
              <ul className="space-y-2 text-sm">
                {references.map((r, i) => (
                  <li key={i}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sage-deep hover:text-terracotta underline break-words"
                    >
                      {r.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </Reveal>
      ) : null}

      {/* Closing CTA band */}
      <Reveal>
        <section className="bg-cream">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <div className="card-warm p-8 md:p-10 text-center">
              <h2 className="font-display text-3xl text-sage-deep font-semibold">
                {t("conditionPage.ctaTitle")}
              </h2>
              <p className="mt-3 text-ink-soft max-w-xl mx-auto">
                {t("conditionPage.ctaBody")}
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/book" className="btn-primary">
                  {t("nav.book")}
                </Link>
                {wa ? (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                    {t("contact.whatsapp")}
                  </a>
                ) : null}
              </div>
              <p className="mt-6 text-xs text-ink-soft/80 max-w-xl mx-auto">
                {t("conditionPage.disclaimer")}
              </p>
            </div>
          </div>
        </section>
      </Reveal>
    </>
  );
}
