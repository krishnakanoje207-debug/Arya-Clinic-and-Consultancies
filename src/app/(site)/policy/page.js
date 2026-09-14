import { getTranslations } from "next-intl/server";
import { getSettings } from "@/lib/settings";

export async function generateMetadata() {
  const [t, tSeo] = await Promise.all([
    getTranslations("policy"),
    getTranslations("seo"),
  ]);
  return { title: t("title"), description: tSeo("policyDescription") };
}

export default async function PolicyPage() {
  const t = await getTranslations("policy");
  const { cancel_cutoff_hours } = await getSettings(["cancel_cutoff_hours"]);
  const cutoff = Number(cancel_cutoff_hours) || 4;

  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-3xl text-sage-deep font-semibold mb-6">
        {t("title")}
      </h1>
      <div className="space-y-4 text-ink-soft leading-relaxed">
        <p>{t("intro")}</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-ink">{t("rescheduleHeading")}</strong>{" "}
            {t("reschedule", { hours: cutoff })}
          </li>
          <li>
            <strong className="text-ink">{t("cancelHeading")}</strong>{" "}
            {t("cancel", { hours: cutoff })}
          </li>
        </ul>

        <h2 className="font-display text-xl text-sage-deep font-semibold pt-4">
          {t("refundHeading")}
        </h2>
        <p>{t("refundIntro")}</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>{t("refundSource")}</li>
          <li>{t("refundTime")}</li>
          <li>{t("refundAuto")}</li>
          <li>{t("refundDiscretion")}</li>
        </ul>

        <p className="text-sm">{t("footerNote")}</p>
      </div>
    </article>
  );
}
