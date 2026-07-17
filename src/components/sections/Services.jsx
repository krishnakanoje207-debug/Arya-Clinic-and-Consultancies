import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { localized } from "@/lib/content";

export default async function Services({ services, locale }) {
  const t = await getTranslations();
  if (!services?.length) return null;

  return (
    <section id="services" className="bg-cream scroll-mt-28">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="font-display text-3xl text-sage-deep font-semibold mb-8">
          <span className="title-accent">{t("sections.servicesTitle")}</span>
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {services.map((s) => (
            <div key={s.id} className="card-warm card-lift p-6 flex flex-col">
              <h3 className="font-display text-xl text-ink font-semibold">
                {localized(s, "title", locale)}
              </h3>
              <p className="mt-2 text-sm text-ink-soft flex-1">
                {localized(s, "description", locale)}
              </p>
              <dl className="mt-4 flex items-center gap-4 text-sm text-ink-soft">
                <div>
                  <dt className="sr-only">{t("services.duration")}</dt>
                  <dd>
                    {s.durationMinutes} {t("services.minutes")}
                  </dd>
                </div>
                <div>
                  <dt className="sr-only">{t("services.fee")}</dt>
                  <dd className="font-semibold text-terracotta">₹{s.feeInr}</dd>
                </div>
                <span className="ml-auto rounded-full bg-sage-soft text-sage-deep px-2 py-0.5 text-xs">
                  {t(`services.${s.mode}`)}
                </span>
              </dl>
              <Link
                href={`/book?service=${s.id}`}
                className="btn-primary text-sm mt-5 text-center"
              >
                {t("services.bookThis")}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
