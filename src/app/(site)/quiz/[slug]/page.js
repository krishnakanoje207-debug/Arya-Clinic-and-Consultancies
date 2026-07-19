import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getQuiz, localizeQuiz, quizSlugs } from "@/lib/quiz-data";
import { getSettings } from "@/lib/settings";
import QuizRunner from "@/components/QuizRunner";
import Reveal from "@/components/Reveal";

// Same hourly revalidation as the sibling pages. The route reads the locale
// cookie via getLocale(), so it renders per request (bilingual) with the
// static params as hints — mirrors /conditions/[slug].
export const revalidate = 3600;

export function generateStaticParams() {
  return quizSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  if (!getQuiz(slug)) return {};
  const t = await getTranslations("quiz");
  return { title: t("heroTitle"), description: t("heroIntro") };
}

export default async function QuizPage({ params }) {
  const { slug } = await params;
  const quiz = getQuiz(slug);
  if (!quiz) notFound();

  const locale = await getLocale();
  const t = await getTranslations("quiz");
  const settings = await getSettings(["contact_whatsapp"]);
  const localized = localizeQuiz(quiz, locale);

  return (
    <>
      {/* Hero band */}
      <section className="relative bg-cream overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="blob w-72 h-72 bg-rose-soft -top-16 right-[10%]" />
          <div className="blob w-72 h-72 bg-gold-soft bottom-[-6rem] left-[-4rem]" style={{ animationDelay: "-6s" }} />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 py-14 md:py-16">
          <Reveal>
            <p className="text-xs uppercase tracking-wide text-sage-deep font-semibold">
              {t("eyebrow")}
            </p>
            <h1 className="mt-3 font-display text-4xl md:text-5xl font-semibold text-ink leading-tight">
              <span className="title-accent">{t("heroTitle")}</span>
            </h1>
            <p className="mt-5 text-lg text-ink-soft leading-relaxed">
              {t("heroIntro")}
            </p>
          </Reveal>
        </div>
      </section>

      {/* The quiz */}
      <section className="bg-cream-deep">
        <div className="mx-auto max-w-3xl px-4 py-12 md:py-14">
          <QuizRunner
            quiz={localized}
            settings={{
              whatsapp: settings?.contact_whatsapp || null,
            }}
          />
        </div>
      </section>
    </>
  );
}
