import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import StickyContact from "@/components/StickyContact";
import { getPublishedConditions, localized } from "@/lib/content";
import { conditionImage } from "@/lib/conditions-data";
import { getQuiz, quizSlugs } from "@/lib/quiz-data";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Page not found" };

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-deep";

/** Custom 404. Lives at the app root (not inside the (site) group) so it also
 * catches unmatched /admin, /manage and /receipt paths, and pulls the public
 * chrome in directly. A dead link is usually an old shared condition page, so
 * the page routes people to the conditions themselves rather than apologising. */
export default async function NotFound() {
  const [t, tNav, tContact, tFooter, locale] = await Promise.all([
    getTranslations("notFound"),
    getTranslations("nav"),
    getTranslations("contact"),
    getTranslations("footer"),
    getLocale(),
  ]);
  const [conditions, settings] = await Promise.all([
    getPublishedConditions(),
    getSettings(["contact_whatsapp"]).catch(() => ({})),
  ]);

  const wa = settings.contact_whatsapp
    ? `https://wa.me/${String(settings.contact_whatsapp).replace(/\D/g, "")}`
    : null;
  const [quizSlug] = quizSlugs();
  const quiz = quizSlug ? getQuiz(quizSlug) : null;

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-24 grid gap-12 md:grid-cols-[1.05fr_1fr] md:items-center lg:gap-20">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-ink leading-[1.12] text-balance">
              <span className="title-accent">{t("title")}</span>
            </h1>
            <p className="mt-6 max-w-[44ch] text-lg text-ink-soft leading-relaxed">
              {t("body")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book" className={`btn-primary ${FOCUS}`}>
                {tNav("book")}
              </Link>
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  className={`btn-ghost ${FOCUS}`}
                >
                  {tContact("whatsapp")}
                </a>
              ) : (
                <Link href="/" className={`btn-ghost ${FOCUS}`}>
                  {t("home")}
                </Link>
              )}
            </div>
          </div>

          {conditions.length ? (
            <nav
              aria-labelledby="nf-conditions"
              className="rounded-[1.5rem] bg-cream-deep ring-1 ring-[var(--border)] p-5 sm:p-7"
            >
              <h2 id="nf-conditions" className="font-display text-xl text-sage-deep font-semibold px-3">
                {tFooter("conditionsHeading")}
              </h2>
              <ul className="mt-4 grid gap-1">
                {conditions.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/conditions/${c.slug}`}
                      className={`group flex items-center gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-cream ${FOCUS}`}
                    >
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--border)] bg-sage-soft">
                        <Image
                          src={conditionImage(c)}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-110"
                        />
                      </span>
                      <span className="font-semibold text-ink leading-snug transition-colors group-hover:text-sage-deep">
                        {localized(c, "name", locale)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {quiz ? (
                <p className="mt-5 mx-3 pt-5 border-t border-[var(--border)] text-sm text-ink-soft">
                  {t("quizPrompt")}{" "}
                  <Link
                    href={`/quiz/${quizSlug}`}
                    className={`font-semibold text-terracotta-deep underline underline-offset-4 hover:text-terracotta ${FOCUS}`}
                  >
                    {localized(quiz, "name", locale)}
                  </Link>
                </p>
              ) : null}
            </nav>
          ) : null}
        </div>
      </main>
      <SiteFooter />
      {/* Same mobile chrome as every (site) page: spacer + sticky Book bar. */}
      <div className="h-16 md:hidden" aria-hidden="true" />
      <StickyContact whatsapp={settings.contact_whatsapp} />
    </>
  );
}
