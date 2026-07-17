import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { getSettings } from "@/lib/settings";
import HealingSteps from "@/components/HealingSteps";

/** "Your Path to Healing" (v2.1) — two columns: a numbered step accordion +
 * CTAs on the left, an arch-shaped consultation photo on the right. Copy is
 * static/bilingual via the existing `healingPath` namespace. */
export default async function HealingPath() {
  const [t, tn] = await Promise.all([
    getTranslations("healingPath"),
    getTranslations("nav"),
  ]);
  const steps = t.raw("steps");
  const s = await getSettings(["contact_whatsapp"]).catch(() => ({}));
  const wa = s.contact_whatsapp
    ? `https://wa.me/${String(s.contact_whatsapp).replace(/\D/g, "")}`
    : null;

  return (
    <section id="healing" className="bg-cream-deep scroll-mt-28">
      <div className="mx-auto max-w-7xl px-4 py-16 grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-sage-deep font-semibold">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 font-display text-3xl text-sage-deep font-semibold">
            <span className="title-accent">{t("title")}</span>
          </h2>
          <p className="mt-4 text-ink-soft max-w-md">{t("subtitle")}</p>

          <HealingSteps steps={steps} />

          <p className="mt-6 text-sm text-ink-soft leading-relaxed max-w-md">
            {t("holistic")}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/book" className="btn-primary">
              {tn("book")}
            </Link>
            {wa ? (
              <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost">
                {t("chatWhatsapp")}
              </a>
            ) : null}
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-[4/5] w-full max-w-md mx-auto overflow-hidden rounded-[1.5rem] rounded-tr-[6rem] shadow-xl ring-1 ring-[var(--border)] bg-sage-soft">
            <Image
              src="/photos/consult.jpg"
              alt=""
              fill
              sizes="(min-width:768px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
