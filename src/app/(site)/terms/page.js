import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const [t, tSeo] = await Promise.all([
    getTranslations("terms"),
    getTranslations("seo"),
  ]);
  return { title: t("title"), description: tSeo("termsDescription") };
}

export default async function TermsPage() {
  const t = await getTranslations("terms");

  const sections = [
    "acceptance",
    "services",
    "appointments",
    "cancellation",
    "telemedicine",
    "medicines",
    "privacy",
    "ip",
    "liability",
    "contact",
  ];

  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-3xl text-sage-deep font-semibold mb-6">
        {t("title")}
      </h1>
      <div className="space-y-6 text-ink-soft leading-relaxed">
        <p>{t("intro")}</p>

        {sections.map((key) => (
          <section key={key} className="space-y-2">
            <h2 className="font-display text-xl text-sage-deep font-semibold pt-2">
              {t(`${key}.heading`)}
            </h2>
            <p>
              {t.rich(`${key}.body`, {
                policyLink: (chunks) => (
                  <a href="/policy" className="text-sage-deep underline">
                    {chunks}
                  </a>
                ),
                privacyLink: (chunks) => (
                  <a href="/privacy" className="text-sage-deep underline">
                    {chunks}
                  </a>
                ),
              })}
            </p>
          </section>
        ))}

        <p className="text-sm">{t("lastUpdated")}</p>
      </div>
    </article>
  );
}
