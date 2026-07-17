import Link from "next/link";
import { getTranslations } from "next-intl/server";

/** Compact, tasteful CTA band inviting visitors to the women's health
 * self-check quiz (T8). Claims-neutral: a private awareness tool, not a
 * diagnosis. Links to /quiz/womens-health. */
export default async function SelfCheck() {
  const t = await getTranslations("selfCheck");
  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="card-warm p-8 md:p-10 md:flex md:items-center md:justify-between md:gap-8">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-wide text-sage-deep font-semibold">
              {t("tag")}
            </p>
            <h2 className="mt-2 font-display text-2xl md:text-3xl text-ink font-semibold">
              <span className="title-accent">{t("title")}</span>
            </h2>
            <p className="mt-3 text-ink-soft leading-relaxed">{t("body")}</p>
          </div>
          <div className="mt-6 md:mt-0 shrink-0">
            <Link href="/quiz/womens-health" className="btn-primary">
              {t("cta")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
